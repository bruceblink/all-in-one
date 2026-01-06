---
sidebar_position: 7
typora-root-url: ./..\..\static
---

# 第 2 章 基础构建块（Building blocks）

**本章涵盖内容**

- 使用交互式shell
- 使用变量
- 组织代码
-  理解类型系统
- 使用运算符
- 理解运行时

是时候开始学习Elixir了。本章将介绍该语言的基本构建块，例如模块、函数和类型系统。这将是一次有些冗长且可能并不特别令人兴奋的语言特性之旅，但这里介绍的内容非常重要，因为它为探索更有趣、更高级的主题奠定了基础。

开始之前，请确保您已安装Elixir 1.15版本和Erlang 26版本。安装Elixir有几种方式，最好遵循官方Elixir网站上的说明：https://elixir-lang.org/install.html。

准备工作完成后，让我们开始探索Elixir。您首先需要了解的是交互式shell。

**详细信息**
本书不会提供任何语言或平台特性的详细参考手册。那样会占用太多篇幅，而且材料很快就会过时。您可以查阅以下其他参考资料：

- 若需快速了解语法，可查阅Elixir官方网站的入门指南：https://mng.bz/NVRn。
- 更详细的参考可以在在线文档中找到：https://hexdocs.pm/elixir。
- 针对具体问题，您可以访问Elixir论坛（https://elixirforum.com/）或Slack频道（https://elixir-lang.slack.com/）。
- 最后，对于许多内容，您可能需要查阅Erlang文档：https://www.erlang.org/doc。如果您不熟悉Erlang语法，可能还需要阅读Elixir的Erlang速成课程（https://elixir-lang.org/crash-course.html）。

## **2.1 交互式shell**（The interactive shell）

实验和学习语言特性最简单的方法是通过交互式shell。您可以通过运行`iex`命令从命令行启动Elixir交互式shell：

```bash
$ iex
Erlang/OTP 26 [erts-14.0] [source] [64-bit] [smp:20:20] [ds:20:20:10]
Interactive Elixir (1.15.0) - press Ctrl+C to exit (type h() ENTER for help)
iex(1)>
```

运行`iex`会启动一个BEAM实例，然后在其中启动一个交互式Elixir shell。会打印运行时信息，例如Erlang和Elixir版本号，然后提供提示符，以便您可以输入Elixir表达式：

```elixir
iex(1)> 1 + 2
3
```

输入表达式后，它会被解释并执行，然后将返回值打印到屏幕上。

> **注意** Elixir中的所有内容都是具有返回值的表达式。这不仅包括函数调用，还包括`if`和`case`等结构。

> **提示** 您将在本书中广泛使用`iex`，尤其是在前几章。表达式的结果通常不特别重要，为了减少干扰会被省略。但请记住，每个表达式都会返回一个结果，当您在shell中输入表达式时，其结果将会显示。

您几乎可以输入任何构成有效Elixir代码的内容，包括相对复杂的多行表达式：

```elixir
iex(2)> 2 * (3 + 1 ) / 4
2.0
```

请注意，shell直到您在最后一行完成表达式后才对其进行求值。在Elixir中，您不需要特殊字符（例如分号）来表示表达式的结束。相反，如果表达式是完整的，则换行表示表达式的结束。否则，解析器会等待更多输入，直到表达式变得完整。如果您卡住了（例如，忘记了右括号），可以通过在新的一行输入`#iex:break`来中止整个表达式：

```elixir
iex(3)> 1 + (2
...(3)> #iex:break
** (TokenMissingError) iex:1: incomplete expression
iex(3)>
```

退出shell最快的方法是连续按两次Ctrl-C。这样做会强制终止操作系统进程和所有正在执行的后台作业。由于shell主要用于实验，不应用于运行实际的生产系统，因此通常可以这种方式终止它。但如果您想以更优雅的方式停止系统，可以调用`System.stop`。

> **注意** 有多种方式可以启动Elixir和Erlang运行时以及运行Elixir程序。在本章结束时，您将对这些方式有所了解。在本书的第一部分，您将主要使用`iex` shell，因为它是实验语言的简单而有效的方式。

您可以用shell做很多事情，但最常用的是输入表达式并检查其结果。您可以自行研究在shell中还能做些什么。基本帮助可以通过`h`命令获取：

```elixir
iex(3)> h
```

在shell中输入此命令将输出一整屏与`iex`相关的说明。您也可以查阅负责shell工作的`IEx`模块的文档：

```elixir
iex(4)> h IEx
```

您可以在在线文档中找到相同的帮助信息：https://hexdocs.pm/iex。

现在您有了一个基本的实验工具，可以开始研究语言特性了。您将从变量开始。

## **2.2 使用变量**（Working with variables）

Elixir是一门动态编程语言，这意味着您不需要显式声明变量或其类型。相反，变量的类型由它当前包含的数据决定。用Elixir的术语来说，赋值被称为**绑定**。当您用一个值初始化变量时，该变量就被绑定到那个值：

```elixir
iex(1)> monthly_salary = 10000
10000
```

Elixir中的每个表达式都有一个结果。对于 `=` 操作符，结果就是操作符右侧的内容。表达式求值后，shell会将这个结果打印到屏幕上。

现在，您可以引用这个变量：

```elixir
iex(2)> monthly_salary
10000
```

当然，变量可以用于复杂的表达式：

```elixir
iex(3)> monthly_salary * 12
120000
```

在Elixir中，变量名总是以小写字母或下划线开头。之后，可以包含字母、数字和下划线的任意组合。通常的惯例是只使用小写ASCII字母、数字和下划线：

```
valid_variable_name
also_valid_1
validButNotRecommended
NotValid
```

变量名也可以以问号 ( ?) 或感叹号 ( ! ) 结尾：

```
valid_name?
also_ok!
```

变量可以重新绑定到不同的值：

```elixir
iex(1)> monthly_salary = 10000  # 绑定变量
10000                           # 最后一个表达式的结果

iex(2)> monthly_salary          # 返回变量值的表达式
10000                           # 变量的值

iex(3)> monthly_salary = 11000  # 重新绑定
11000

iex(4)> monthly_salary
11000
```

重新绑定并不会改变现有的内存位置。它会预留新的内存，并将符号名重新分配给新的位置。

> **注意** 您应该始终记住数据是不可变的。一旦内存位置被数据占用，在释放之前就不能被修改。但是变量可以重新绑定，这使它们指向不同的内存位置。因此，变量是可变的，但它们所指向的数据是不可变的。

Elixir是一门垃圾回收的语言，这意味着您不必手动释放内存。当变量超出作用域时，相应的内存就有资格被垃圾回收，并将在未来垃圾回收器清理内存时被释放。
