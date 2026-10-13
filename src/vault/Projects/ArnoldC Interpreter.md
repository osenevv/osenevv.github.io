---
type: project
order: 6
kind: Compilers
summary: Executes programs written entirely in Arnold Schwarzenegger movie quotes, running arithmetic, conditional branching, loops, and user subroutines on a custom stack virtual machine.
flow: Source Code > Lexer (Quote Tokenization) > Recursive Descent Parser > AST Generation > Stack VM Execution
proof: Custom stack VM · Recursive descent AST parser · Lexer with multi-token lookahead · C# / .NET 9
usecase: Demonstrating how language compilers, abstract syntax trees, and virtual machines operate from the ground up without relying on parser generator tools like ANTLR or Lex/Yacc.
atwork: Custom DSL parsing, configuration validation, and template language evaluation where off-the-shelf interpreters are too heavy or inflexible.
tradeoff: Tree-walking and stack evaluation instead of JIT bytecode compilation. It prioritizes clean inspection, simple debugging, and clear syntax errors over raw execution throughput.
stack: C#, .NET 9, Lexer, Parser, AST, Stack VM
repo: github.com/osenevv/ArnoldC-CSharp
tags: [project, compilers, csharp, esolang]
---
# ArnoldC Interpreter

A custom interpreter and virtual machine built in **C# / .NET 9** for **ArnoldC**, an esoteric language where all keywords are Arnold Schwarzenegger movie quotes (`IT'S SHOWTIME`, `GET TO THE CHOPPER`, `BECAUSE I'M GOING TO SAY PLEASE`).

## What it does
- **Variable Operations** — Allocates 16-bit signed integer variables, handles assignments (`GET TO THE CHOPPER`), and assigns values (`HERE IS MY INVITATION`).
- **Arithmetic & Logic** — Evaluates expressions using movie one-liners (`YOU'RE NOT YOU YOU'RE ME` for equality, `LET OFF SOME STEAM BENNET` for subtraction).
- **Conditionals & Loops** — Executes branches (`BECAUSE I'M GOING TO SAY PLEASE ... YOU HAVE NO RESPECT FOR LOGIC`) and iterative loops (`STICK AROUND`).
- **Subroutines & I/O** — Calls declared methods, returns values, and outputs results to stdout (`TALK TO THE HAND`).

## Architecture
- **Multi-Word Lexer**: Standard programming languages tokenize single words. ArnoldC uses multi-word sentences as operators, requiring lookahead buffering to distinguish keywords from identifier names.
- **Recursive Descent Parser**: Transforms flat token streams into a validated Abstract Syntax Tree (AST), checking block closures and catching unbalanced control flow before runtime.
- **Stack-Based Execution Engine**: An evaluation runtime maintaining call frames, variable symbol tables, and stack operations.

This compiler-engineering foundation carried directly into treating text as structural data later when building [[ZettelLinker]]'s wikilink parser.

Code: [github.com/osenevv/ArnoldC-CSharp](https://github.com/osenevv/ArnoldC-CSharp)
