// Copyright (c) Microsoft. All rights reserved. Licensed under the Apache License, Version 2.0. 
// See LICENSE.txt in the project root for complete license information.

/// <reference path='services.ts' />

/* @internal */
namespace ts.BreakpointResolver {
    /**
     * Get the breakpoint span in given sourceFile
     */
    export function spanInSourceFileAtLocation(sourceFile: SourceFile, position: number) {
        // Cannot set breakpoint in dts file
        if (sourceFile.flags & NodeFlags.DeclarationFile) {
            return undefined;
        }

        let tokenAtLocation = getTokenAtPosition(sourceFile, position);
        let lineOfPosition = sourceFile.getLineAndCharacterOfPosition(position).line;
        if (sourceFile.getLineAndCharacterOfPosition(tokenAtLocation.getStart(sourceFile)).line > lineOfPosition) {
            // Get previous token if the token is returned starts on new line
            // eg: let x =10; |--- cursor is here
            //     let y = 10; 
            // token at position will return let keyword on second line as the token but we would like to use 
            // token on same line if trailing trivia (comments or white spaces on same line) part of the last token on that line
            tokenAtLocation = findPrecedingToken(tokenAtLocation.pos, sourceFile);

            // Its a blank line
            if (!tokenAtLocation || sourceFile.getLineAndCharacterOfPosition(tokenAtLocation.getEnd()).line !== lineOfPosition) {
                return undefined;
            }
        }

        // Cannot set breakpoint in ambient declarations
        if (isInAmbientContext(tokenAtLocation)) {
            return undefined;
        }

        // Get the span in the node based on its syntax
        return spanInNode(tokenAtLocation);

        function textSpan(startNode: Node, endNode?: Node) {
            const start = startNode.decorators ?
                skipTrivia(sourceFile.text, startNode.decorators.end) :
                startNode.getStart(sourceFile);
            return createTextSpanFromBounds(start, (endNode || startNode).getEnd());
        }

        function textSpanEndingAtNextToken(startNode: Node, previousTokenToFindNextEndToken: Node): TextSpan {
            return textSpan(startNode, findNextToken(previousTokenToFindNextEndToken, previousTokenToFindNextEndToken.parent));
        }

        function spanInNodeIfStartsOnSameLine(node: Node, otherwiseOnNode?: Node): TextSpan {
            if (node && lineOfPosition === sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line) {
                return spanInNode(node);
            }
            return spanInNode(otherwiseOnNode);
        }

        function spanInNodeArray<T>(nodeArray: NodeArray<T>) {
            return createTextSpanFromBounds(skipTrivia(sourceFile.text, nodeArray.pos), nodeArray.end);
        }

        function spanInPreviousNode(node: Node): TextSpan {
            return spanInNode(findPrecedingToken(node.pos, sourceFile));
        }

        function spanInNextNode(node: Node): TextSpan {
            return spanInNode(findNextToken(node, node.parent));
        }

        function spanInNode(node: Node): TextSpan {
            if (node) {
                if (isExpression(node)) {
                    switch (node.parent.kind) {
                        case SyntaxKind.DoStatement:
                            // Set span as if on while keyword
                            return spanInPreviousNode(node);

                        case SyntaxKind.Decorator:
                            // Set breakpoint on the decorator emit
                            return spanInNode(node.parent);

                        case SyntaxKind.ForStatement:
                        case SyntaxKind.ForOfStatement:
                            // For now lets set the span on this expression, fix it later
                            return textSpan(node);

                        case SyntaxKind.BinaryExpression:
                            if ((<BinaryExpression>node.parent).operatorToken.kind === SyntaxKind.CommaToken) {
                                // if this is comma expression, the breakpoint is possible in this expression
                                return textSpan(node);
                            }
                            break;

                        case SyntaxKind.ArrowFunction:
                            if ((<FunctionLikeDeclaration>node.parent).body === node) {
                                // If this is body of arrow function, it is allowed to have the breakpoint
                                return textSpan(node);
                            }
                            break;
                    }
                }

                switch (node.kind) {
                    case SyntaxKind.VariableStatement:
                        // Span on first variable declaration
                        return spanInVariableDeclaration((<VariableStatement>node).declarationList.declarations[0]);

                    case SyntaxKind.VariableDeclaration:
                    case SyntaxKind.PropertyDeclaration:
                    case SyntaxKind.PropertySignature:
                        return spanInVariableDeclaration(<VariableDeclaration>node);

                    case SyntaxKind.Parameter:
                        return spanInParameterDeclaration(<ParameterDeclaration>node);

                    case SyntaxKind.FunctionDeclaration:
                    case SyntaxKind.MethodDeclaration:
                    case SyntaxKind.MethodSignature:
                    case SyntaxKind.GetAccessor:
                    case SyntaxKind.SetAccessor:
                    case SyntaxKind.Constructor:
                    case SyntaxKind.FunctionExpression:
                    case SyntaxKind.ArrowFunction:
                        return spanInFunctionDeclaration(<FunctionLikeDeclaration>node);

                    case SyntaxKind.Block:
                        if (isFunctionBlock(node)) {
                            return spanInFunctionBlock(<Block>node);
                        }
                        // Fall through
                    case SyntaxKind.ModuleBlock:
                        return spanInBlock(<Block>node);

                    case SyntaxKind.CatchClause:
                        return spanInBlock((<CatchClause>node).block);

                    case SyntaxKind.ExpressionStatement:
                        // span on the expression
                        return textSpan((<ExpressionStatement>node).expression);

                    case SyntaxKind.ReturnStatement:
                        // span on return keyword and expression if present
                        return textSpan(node.getChildAt(0), (<ReturnStatement>node).expression);

                    case SyntaxKind.WhileStatement:
                        // Span on while(...)
                        return textSpanEndingAtNextToken(node, (<WhileStatement>node).expression);

                    case SyntaxKind.DoStatement:
                        // span in statement of the do statement
                        return spanInNode((<DoStatement>node).statement);

                    case SyntaxKind.DebuggerStatement:
                        // span on debugger keyword
                        return textSpan(node.getChildAt(0));

                    case SyntaxKind.IfStatement:
                        // set on if(..) span
                        return textSpanEndingAtNextToken(node, (<IfStatement>node).expression);

                    case SyntaxKind.LabeledStatement:
                        // span in statement
                        return spanInNode((<LabeledStatement>node).statement);

                    case SyntaxKind.BreakStatement:
                    case SyntaxKind.ContinueStatement:
                        // On break or continue keyword and label if present
                        return textSpan(node.getChildAt(0), (<BreakOrContinueStatement>node).label);

                    case SyntaxKind.ForStatement:
                        return spanInForStatement(<ForStatement>node);

                    case SyntaxKind.ForInStatement:
                        // span of for (a in ...)
                        return textSpanEndingAtNextToken(node, (<ForInStatement>node).expression);

                    case SyntaxKind.ForOfStatement:
                        // span in initializer
                        return spanInInitializerOfForLike(<ForOfStatement | ForInStatement>node);

                    case SyntaxKind.SwitchStatement:
                        // span on switch(...)
                        return textSpanEndingAtNextToken(node, (<SwitchStatement>node).expression);

                    case SyntaxKind.CaseClause:
                    case SyntaxKind.DefaultClause:
                        // span in first statement of the clause
                        return spanInNode((<CaseOrDefaultClause>node).statements[0]);

                    case SyntaxKind.TryStatement:
                        // span in try block
                        return spanInBlock((<TryStatement>node).tryBlock);

                    case SyntaxKind.ThrowStatement:
                        // span in throw ...
                        return textSpan(node, (<ThrowStatement>node).expression);

                    case SyntaxKind.ExportAssignment:
                        // span on export = id
                        return textSpan(node, (<ExportAssignment>node).expression);

                    case SyntaxKind.ImportEqualsDeclaration:
                        // import statement without including semicolon
                        return textSpan(node, (<ImportEqualsDeclaration>node).moduleReference);

                    case SyntaxKind.ImportDeclaration:
                        // import statement without including semicolon
                        return textSpan(node, (<ImportDeclaration>node).moduleSpecifier);

                    case SyntaxKind.ExportDeclaration:
                        // import statement without including semicolon
                        return textSpan(node, (<ExportDeclaration>node).moduleSpecifier);

                    case SyntaxKind.ModuleDeclaration:
                        // span on complete module if it is instantiated
                        if (getModuleInstanceState(node) !== ModuleInstanceState.Instantiated) {
                            return undefined;
                        }

                    case SyntaxKind.ClassDeclaration:
                    case SyntaxKind.EnumDeclaration:
                    case SyntaxKind.EnumMember:
                    case SyntaxKind.CallExpression:
                    case SyntaxKind.NewExpression:
                    case SyntaxKind.BindingElement:
                        // span on complete node
                        return textSpan(node);

                    case SyntaxKind.WithStatement:
                        // span in statement
                        return spanInNode((<WithStatement>node).statement);

                    case SyntaxKind.Decorator:
                        return spanInNodeArray(node.parent.decorators);

                    case SyntaxKind.ObjectBindingPattern:
                    case SyntaxKind.ArrayBindingPattern:
                        return spanInBindingPattern(<BindingPattern>node);

                    // No breakpoint in interface, type alias
                    case SyntaxKind.InterfaceDeclaration:
                    case SyntaxKind.TypeAliasDeclaration:
                        return undefined;

                    // Tokens:
                    case SyntaxKind.SemicolonToken:
                    case SyntaxKind.EndOfFileToken:
                        return spanInNodeIfStartsOnSameLine(findPrecedingToken(node.pos, sourceFile));

                    case SyntaxKind.CommaToken:
                        return spanInPreviousNode(node)
                        
                    case SyntaxKind.OpenBraceToken:
                        return spanInOpenBraceToken(node);

                    case SyntaxKind.CloseBraceToken:
                        return spanInCloseBraceToken(node);
                        
                    case SyntaxKind.CloseBracketToken:
                        return spanInCloseBracketToken(node);

                    case SyntaxKind.OpenParenToken: 
                        return spanInOpenParenToken(node);

                    case SyntaxKind.CloseParenToken:
                        return spanInCloseParenToken(node);

                    case SyntaxKind.ColonToken:
                        return spanInColonToken(node);

                    case SyntaxKind.GreaterThanToken:
                    case SyntaxKind.LessThanToken:
                        return spanInGreaterThanOrLessThanToken(node);

                    // Keywords:
                    case SyntaxKind.WhileKeyword:
                        return spanInWhileKeyword(node);

                    case SyntaxKind.ElseKeyword:
                    case SyntaxKind.CatchKeyword:
                    case SyntaxKind.FinallyKeyword:
                        return spanInNextNode(node);

                    case SyntaxKind.OfKeyword:
                        return spanInOfKeyword(node);

                    default:
                        // If this is name of property assignment, set breakpoint in the initializer
                        if (node.parent.kind === SyntaxKind.PropertyAssignment && (<PropertyDeclaration>node.parent).name === node) {
                            return spanInNode((<PropertyDeclaration>node.parent).initializer);
                        }

                        // Breakpoint in type assertion goes to its operand
                        if (node.parent.kind === SyntaxKind.TypeAssertionExpression && (<TypeAssertion>node.parent).type === node) {
                            return spanInNode((<TypeAssertion>node.parent).expression);
                        }

                        // return type of function go to previous token
                        if (isFunctionLike(node.parent) && (<FunctionLikeDeclaration>node.parent).type === node) {
                            return spanInPreviousNode(node);
                        }

                        // initializer of variable/parameter declaration go to previous node
                        if ((node.parent.kind === SyntaxKind.VariableDeclaration ||
                            node.parent.kind === SyntaxKind.Parameter)) {
                            const paramOrVarDecl = <VariableDeclaration | ParameterDeclaration>node.parent;
                            if (paramOrVarDecl.initializer === node ||
                                paramOrVarDecl.type === node ||
                                isAssignmentOperator(node.kind)) {
                                return spanInPreviousNode(node);
                            }
                        }

                        // Default go to parent to set the breakpoint
                        return spanInNode(node.parent);
                }
            }

            function textSpanFromVariableDeclaration(variableDeclaration: VariableDeclaration): TextSpan {
                let declarations = variableDeclaration.parent.declarations;
                if (declarations && declarations[0] === variableDeclaration) {
                    // First declaration - include let keyword
                    return textSpan(findPrecedingToken(variableDeclaration.pos, sourceFile, variableDeclaration.parent), variableDeclaration);
                }
                else {
                    // Span only on this declaration
                    return textSpan(variableDeclaration);
                }
            }

            function spanInVariableDeclaration(variableDeclaration: VariableDeclaration): TextSpan {
                // If declaration of for in statement, just set the span in parent
                if (variableDeclaration.parent.parent.kind === SyntaxKind.ForInStatement) {
                    return spanInNode(variableDeclaration.parent.parent);
                }
                
                // If this is a destructuring pattern set breakpoint in binding pattern
                if (isBindingPattern(variableDeclaration.name)) {
                    return spanInBindingPattern(<BindingPattern>variableDeclaration.name);
                }

                // Breakpoint is possible in variableDeclaration only if there is initialization
                // or its declaration from 'for of'
                if (variableDeclaration.initializer ||
                    (variableDeclaration.flags & NodeFlags.Export) ||
                    variableDeclaration.parent.parent.kind === SyntaxKind.ForOfStatement) {
                    return textSpanFromVariableDeclaration(variableDeclaration);
                }

                let declarations = variableDeclaration.parent.declarations;
                if (declarations && declarations[0] !== variableDeclaration) {
                    // If we cant set breakpoint on this declaration, set it on previous one
                    // Because the variable declaration may be binding pattern and 
                    // we would like to set breakpoint in last binding element if thats the case,
                    // use preceding token instead
                    return spanInNode(findPrecedingToken(variableDeclaration.pos, sourceFile, variableDeclaration.parent));
                }
            }

            function canHaveSpanInParameterDeclaration(parameter: ParameterDeclaration): boolean {
                // Breakpoint is possible on parameter only if it has initializer, is a rest parameter, or has public or private modifier
                return !!parameter.initializer || parameter.dotDotDotToken !== undefined ||
                    !!(parameter.flags & NodeFlags.Public) || !!(parameter.flags & NodeFlags.Private);
            }

            function spanInParameterDeclaration(parameter: ParameterDeclaration): TextSpan {
                if (isBindingPattern(parameter.name)) {
                    // set breakpoint in binding pattern
                    return spanInBindingPattern(<BindingPattern>parameter.name);
                }
                else if (canHaveSpanInParameterDeclaration(parameter)) {
                    return textSpan(parameter);
                }
                else {
                    let functionDeclaration = <FunctionLikeDeclaration>parameter.parent;
                    let indexOfParameter = indexOf(functionDeclaration.parameters, parameter);
                    if (indexOfParameter) {
                        // Not a first parameter, go to previous parameter
                        return spanInParameterDeclaration(functionDeclaration.parameters[indexOfParameter - 1]);
                    }
                    else {
                        // Set breakpoint in the function declaration body
                        return spanInNode(functionDeclaration.body);
                    }
                }
            }

            function canFunctionHaveSpanInWholeDeclaration(functionDeclaration: FunctionLikeDeclaration) {
                return !!(functionDeclaration.flags & NodeFlags.Export) ||
                    (functionDeclaration.parent.kind === SyntaxKind.ClassDeclaration && functionDeclaration.kind !== SyntaxKind.Constructor);
            }

            function spanInFunctionDeclaration(functionDeclaration: FunctionLikeDeclaration): TextSpan {
                // No breakpoints in the function signature
                if (!functionDeclaration.body) {
                    return undefined;
                }

                if (canFunctionHaveSpanInWholeDeclaration(functionDeclaration)) {
                    // Set the span on whole function declaration
                    return textSpan(functionDeclaration);
                }

                // Set span in function body
                return spanInNode(functionDeclaration.body);
            }

            function spanInFunctionBlock(block: Block): TextSpan {
                let nodeForSpanInBlock = block.statements.length ? block.statements[0] : block.getLastToken();
                if (canFunctionHaveSpanInWholeDeclaration(<FunctionLikeDeclaration>block.parent)) {
                    return spanInNodeIfStartsOnSameLine(block.parent, nodeForSpanInBlock);
                }

                return spanInNode(nodeForSpanInBlock);
            }

            function spanInBlock(block: Block): TextSpan {
                switch (block.parent.kind) {
                    case SyntaxKind.ModuleDeclaration:
                        if (getModuleInstanceState(block.parent) !== ModuleInstanceState.Instantiated) {
                            return undefined;
                        }

                    // Set on parent if on same line otherwise on first statement
                    case SyntaxKind.WhileStatement:
                    case SyntaxKind.IfStatement:
                    case SyntaxKind.ForInStatement:
                        return spanInNodeIfStartsOnSameLine(block.parent, block.statements[0]);

                    // Set span on previous token if it starts on same line otherwise on the first statement of the block
                    case SyntaxKind.ForStatement:
                    case SyntaxKind.ForOfStatement:
                        return spanInNodeIfStartsOnSameLine(findPrecedingToken(block.pos, sourceFile, block.parent), block.statements[0]);
                }

                // Default action is to set on first statement
                return spanInNode(block.statements[0]);
            }

            function spanInInitializerOfForLike(forLikeStaement: ForStatement | ForOfStatement | ForInStatement): TextSpan {
                if (forLikeStaement.initializer.kind === SyntaxKind.VariableDeclarationList) {
                    // declaration list, set breakpoint in first declaration
                    let variableDeclarationList = <VariableDeclarationList>forLikeStaement.initializer;
                    if (variableDeclarationList.declarations.length > 0) {
                        return spanInNode(variableDeclarationList.declarations[0]);
                    }
                }
                else {
                    // Expression - set breakpoint in it
                    return spanInNode(forLikeStaement.initializer);
                }
            }

            function spanInForStatement(forStatement: ForStatement): TextSpan {
                if (forStatement.initializer) {
                    return spanInInitializerOfForLike(forStatement);
                }

                if (forStatement.condition) {
                    return textSpan(forStatement.condition);
                }
                if (forStatement.incrementor) {
                    return textSpan(forStatement.incrementor);
                }
            }

            function spanInBindingPattern(bindingPattern: BindingPattern): TextSpan {
                // Set breakpoint in first binding element
                let firstBindingElement = forEach(bindingPattern.elements,
                    element => element.kind !== SyntaxKind.OmittedExpression ? element : undefined);

                if (firstBindingElement) {
                    return spanInNode(firstBindingElement);
                }

                // Empty binding pattern of binding element, set breakpoint on binding element
                if (bindingPattern.parent.kind === SyntaxKind.BindingElement) {
                    return spanInNode(bindingPattern.parent);
                }

                // Variable declaration is used as the span
                return textSpanFromVariableDeclaration(<VariableDeclaration>bindingPattern.parent);
            }

            // Tokens:
            function spanInOpenBraceToken(node: Node): TextSpan {
                switch (node.parent.kind) {
                    case SyntaxKind.EnumDeclaration:
                        let enumDeclaration = <EnumDeclaration>node.parent;
                        return spanInNodeIfStartsOnSameLine(findPrecedingToken(node.pos, sourceFile, node.parent), enumDeclaration.members.length ? enumDeclaration.members[0] : enumDeclaration.getLastToken(sourceFile));

                    case SyntaxKind.ClassDeclaration:
                        let classDeclaration = <ClassDeclaration>node.parent;
                        return spanInNodeIfStartsOnSameLine(findPrecedingToken(node.pos, sourceFile, node.parent), classDeclaration.members.length ? classDeclaration.members[0] : classDeclaration.getLastToken(sourceFile));

                    case SyntaxKind.CaseBlock:
                        return spanInNodeIfStartsOnSameLine(node.parent.parent, (<CaseBlock>node.parent).clauses[0]);
                }

                // Default to parent node
                return spanInNode(node.parent);
            }

            function spanInCloseBraceToken(node: Node): TextSpan {
                switch (node.parent.kind) {
                    case SyntaxKind.ModuleBlock:
                        // If this is not instantiated module block no bp span
                        if (getModuleInstanceState(node.parent.parent) !== ModuleInstanceState.Instantiated) {
                            return undefined;
                        }

                    case SyntaxKind.EnumDeclaration:
                    case SyntaxKind.ClassDeclaration:
                        // Span on close brace token
                        return textSpan(node);

                    case SyntaxKind.Block:
                        if (isFunctionBlock(node.parent)) {
                            // Span on close brace token
                            return textSpan(node);
                        }
                        // fall through.

                    case SyntaxKind.CatchClause:
                        return spanInNode(lastOrUndefined((<Block>node.parent).statements));

                    case SyntaxKind.CaseBlock:
                        // breakpoint in last statement of the last clause
                        let caseBlock = <CaseBlock>node.parent;
                        let lastClause = lastOrUndefined(caseBlock.clauses);
                        if (lastClause) {
                            return spanInNode(lastOrUndefined(lastClause.statements));
                        }
                        return undefined;

                    case SyntaxKind.ObjectBindingPattern:
                        // Breakpoint in last binding element or binding pattern if it contains no elements
                        let bindingPattern = <BindingPattern>node.parent;
                        return spanInNode(lastOrUndefined(bindingPattern.elements) || bindingPattern);

                    // Default to parent node
                    default:
                        return spanInNode(node.parent);
                }
            }

            function spanInCloseBracketToken(node: Node): TextSpan {
                switch (node.parent.kind) {
                    case SyntaxKind.ArrayBindingPattern:
                        // Breakpoint in last binding element or binding pattern if it contains no elements
                        let bindingPattern = <BindingPattern>node.parent;
                        return spanInNode(lastOrUndefined(bindingPattern.elements) || bindingPattern);

                    // Default to parent node
                    default:
                        return spanInNode(node.parent);
                }
            }

            function spanInOpenParenToken(node: Node): TextSpan {
                if (node.parent.kind === SyntaxKind.DoStatement) {
                    // Go to while keyword and do action instead
                    return spanInPreviousNode(node);
                }

                // Default to parent node
                return spanInNode(node.parent);
            }

            function spanInCloseParenToken(node: Node): TextSpan {
                // Is this close paren token of parameter list, set span in previous token
                switch (node.parent.kind) {
                    case SyntaxKind.FunctionExpression:
                    case SyntaxKind.FunctionDeclaration:
                    case SyntaxKind.ArrowFunction:
                    case SyntaxKind.MethodDeclaration:
                    case SyntaxKind.MethodSignature:
                    case SyntaxKind.GetAccessor:
                    case SyntaxKind.SetAccessor:
                    case SyntaxKind.Constructor:
                    case SyntaxKind.WhileStatement:
                    case SyntaxKind.DoStatement:
                    case SyntaxKind.ForStatement:
                    case SyntaxKind.ForOfStatement:
                        return spanInPreviousNode(node);

                    // Default to parent node
                    default:
                        return spanInNode(node.parent);
                }
            }

            function spanInColonToken(node: Node): TextSpan {
                // Is this : specifying return annotation of the function declaration
                if (isFunctionLike(node.parent) ||
                    node.parent.kind === SyntaxKind.PropertyAssignment || 
                    node.parent.kind === SyntaxKind.Parameter) {
                    return spanInPreviousNode(node);
                }

                return spanInNode(node.parent);
            }

            function spanInGreaterThanOrLessThanToken(node: Node): TextSpan {
                if (node.parent.kind === SyntaxKind.TypeAssertionExpression) {
                    return spanInNode((<TypeAssertion>node.parent).expression);
                }

                return spanInNode(node.parent);
            }

            function spanInWhileKeyword(node: Node): TextSpan {
                if (node.parent.kind === SyntaxKind.DoStatement) {
                    // Set span on while expression
                    return textSpanEndingAtNextToken(node, (<DoStatement>node.parent).expression);
                }

                // Default to parent node
                return spanInNode(node.parent);
            }

            function spanInOfKeyword(node: Node): TextSpan {
                if (node.parent.kind === SyntaxKind.ForOfStatement) {
                    // set using next token
                    return spanInNextNode(node);
                }

                // Default to parent node
                return spanInNode(node.parent);
            }
        }
   }
}