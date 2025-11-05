---
sidebar_position: 4
typora-root-url: ./..\..\static
---
# 第 3 章 每一行都至关重要（Every line counts）

本章内容包括：

- 在 Haskell 中实现副作用与输入/输出
- 在含副作用的代码中使用纯（无副作用的）代码
- 与操作系统环境交互
- 在程序中加入命令行参数解析器

在上一章中，我们学习了如何编写用于字符串转换的算法，并探索了 Haskell 编程的基本概念；不过，当时我们只能在 GHCi 中测试功能。现在，我们希望将注意力转向编写第一个真正的程序——一个可以从命令行运行的程序。

在命令行中工作，或在类 Unix 系统上编写自动化脚本时，人们常常使用多个程序组成的“管道”（pipeline）来完成特定任务，比如搜索或转换数据。为了方便进程间通信，通常使用文本流（streams of text）在不同进程之间传递信息，而这通常通过管道符号 `|` 来实现。图 3.1 展示了这种通过 shell 命令和管道来转换数据的思路。

> **图 3.1** 使用 shell 管道命令转换数据的示例
>
> ![figure3-1](/img/learn-haskell-by-example/chapter3/figure3-1.png)

为了让这种机制发挥作用，Unix 环境中提供了许多工具来执行基础任务，这些工具通过管道组合起来，就能完成更复杂的操作。其中之一是 **nl**，即 “number lines” 的缩写。它的功能非常简单：打印文件内容并为每一行编号。换句话说，它能为任意文本生成一个带行号的清单。示例如下：

```shell
$ nl testFile.txt
     1  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Maecenas a
     2  mattis nisi, eleifend auctor erat. Vivamus nisl sapien, suscipit non
     3  gravida sed, mattis a velit. Fusce non iaculis urna, a volutpat leo.
     4  Ut non mauris vel massa tincidunt mattis. Sed eu viverra lectus.
     5  Donec pulvinar justo quis condimentum suscipit. Donec vel odio eu
     6  odio maximus consequat at at tellus. Ut placerat suscipit vulputate.
     7  Donec eu eleifend massa, et aliquet ipsum.
     8  Mauris eget massa a tellus tristique consequat. Nunc tempus sit amet
     9  est sit amet malesuada. Curabitur ultrices in leo vitae tristique.
    10  Suspendisse potenti. Nam dui risus, gravida eu scelerisque sit amet,
    11  tincidunt id neque. In sit amet purus gravida, venenatis lectus sit
    12  amet, gravida massa. In iaculis commodo massa, in viverra est mollis
    13  et. Nunc vehicula felis a vestibulum egestas. Phasellus eu libero sed
    14  odio facilisis feugiat id quis velit. Proin a ex dapibus, lacinia dui
    15  at, vehicula ipsum.
```

这个工具可以以多种方式使用。例如：

- 为文件的每一行编号；
- 在输出中搜索某个字符串，然后去掉匹配内容，仅保留行号；
   结果就是包含目标字符串的行号，这在查找源代码引用时非常有用；
- 另一个例子是，先创建一个数据项列表，根据某个条件进行排序，再为结果编号；
   这样可以得到一个带索引的有序清单。

那为什么不趁早试试看，用 Haskell 自己重写这样一个小工具呢？虽然只使用纯函数和简单定义的编程方式很舒服，但对于程序员来说，更有价值的是去探索如何在一个以“纯函数式编程”著称的语言中实现输入与输出（即副作用）。无副作用的函数如何与 I/O 这种典型的副作用兼容？这是我们希望在学习初期就提出并回答的问题。

当然，我们把这当作一次学习练习。真正的 `nl` 工具有许多功能，比如各种格式化选项，我们不会完全复现；但它缺少一些有趣的功能，例如**反向编号**，这是我们想要添加的。因此，让我们迈出编写“真实”程序的第一步——动手实现一个为文件行编号的工具！

本章首先介绍 **do 记法（do notation）**，并讲解如何在 Haskell 中执行输入输出操作。接着，我们将学习如何把第二章学到的语法和函数整合到这种新写法中。最后，在了解了如何与操作系统环境交互之后，我们将开始构建这个工具的基础，并在第 4 章中通过一个简单的示例程序完成它。

## 3.1 与外部交互（Talking to the outside）

我们遇到的第一个显而易见的挑战，源自 Haskell 的**纯函数式设计**。在 Haskell 中，函数**不允许产生副作用**，也不允许与外部环境交互。
一个函数的结果只能依赖于它的输入参数，除此之外什么也不能依赖。因此，在函数中我们无法读取文件，也不能访问操作系统的环境。但问题来了——那 Haskell 程序又是怎么实现这些（看似简单）功能的呢？答案在一个特殊的类型中：`IO`。在上一章中，我们已经看到，程序中的 `main` “函数”其实并不是一个真正的函数，而是一个类型为 `IO ()` 的值。

通常我们称这种值为 **IO 动作（IO action）**。IO 动作可以被执行（invoke），并且必须返回某种值。对于 `main` 动作，它返回的其实是 `()`，也就是唯一属于 `()` 类型的值。这种类型被称为 **unit（单元类型）**，相当于“什么都不返回”的占位符。

------

### 3.1.1  简单输入输出（Simple actions for input and output）

我们来看几个 IO 动作的例子：

```haskell
getLine :: IO String
putStrLn :: String -> IO ()
```

这两个动作分别与外部环境进行输入和输出交互。 `getLine` 从标准输入（stdin）中读取一行字符串，以换行符结束，通常就是从命令行中输入的文本。 因此它的类型是 `IO String`，表示这是一个会返回 `String` 的 IO 动作。而 `putStrLn` 则会把一个字符串打印到标准输出（stdout），并在末尾自动添加一个换行符。它的类型 `String -> IO ()` 表示：`putStrLn` 本身是一个函数，调用它会**产生**一个 IO 动作。换句话说：IO 动作是“与外界交互的描述”，但仅仅存在并不会触发它，只有在被求值（evaluated）时才会真正执行。

我们来看一个完整的例子，它从用户那里读取一行文字并打印回去：

**清单 3.1：读取并输出用户输入的简单程序**

```haskell
module Main (main) where  -- #1
main :: IO ()
main = do                 -- #2
  line <- getLine         -- #3
  putStrLn line           -- #4
```

注解：

- `--1`从 `Main` 模块导出 `main` 动作
- `--2`开始一个 `do` 代码块
- `--3`执行 `getLine` 并将结果绑定为 `line`
- `--4`执行 `putStrLn line`，输出字符串

------

这里出现了一种新语法，叫做 **do 记法（do notation）**。它以关键字 `do` 开头，表示开始一个 IO 动作的定义。在这个 `do` 块中，我们可以顺序调用其他 IO 动作。注意：在纯函数中执行 IO 动作是不被允许的，必须在 `do` 块或 IO 语境中执行。使用 `<-` 语法，我们可以让程序在运行到这一行时执行某个 IO 动作，并把结果绑定到变量上。这样，“交互的描述”就变成了真正的执行。最后一个语句决定整个 `do` 块（即整个 IO 动作）的返回类型。由于 `putStrLn line` 的类型是 `IO ()`，因此整个 `main` 的类型正好匹配。

> 💡 **注意：**
>  `do` 记法不仅用于 `IO`，它其实是任何 **Monad（单子）** 的语法糖。
>  不过我们暂时先不展开，后面章节会详细讨论。

需要注意的是，这种语法看起来和感觉上都很像命令式编程，因为这些动作（action）是从上到下依次执行的。然而，不要将它与命令式编程混为一谈；我们依然在编写**函数式程序**。这种语法的作用是**组合动作**，因为这些动作可以用来表示任意复杂的行为。例如：

- 在屏幕上打印文本
- 通过网络接口发送数据
- 构建并向用户显示图形界面（GUI）

实际上，**任何程序本身都是一个 IO 动作**，因为程序的入口点 `main` 的类型就是 `IO ()`。因此，通常来说，我们无法“逃离”一个 IO 动作——也就是说，不能在纯代码中直接指定去执行某个 IO 动作。当一个 IO 动作返回一个值时，这个值必须在**另一个 IO 动作中**被处理。

### 3.1.2 模拟循环（Simulating a loop）

让我们用刚学的语法编写一个交互式动作：读取用户输入的每一行，并在前面加上递增的行号——一个简化版的交互式 `nl`。先写一个最简单的版本：

```haskell
interactiveLines :: IO ()
interactiveLines = do
  line <- getLine
  putStrLn ("1. " ++ line)
```

然而，这样的程序只会打印一次编号。我们需要**重复这个过程**，并且同时**递增行号**。那该如何实现呢？首先，在 Haskell 中我们**没有循环结构**，并且数据是**不可变的**，因此我们无法像其他语言那样通过循环来让动作反复执行并递增计数器。为了实现类似“循环”的效果，我们可以**再次调用这个动作本身**。

```haskell
interactiveLines :: IO ()
interactiveLines = do
  line <- getLine
  putStrLn ("1. " ++ line)
  interactiveLines
```

但是，我们该如何递增计数器呢？到目前为止，每一行都会始终被视为第一行。我们需要做的是**通过参数化这个动作**来实现。也就是说，定义一个**接收计数器作为参数**并**返回一个 IO 动作**的函数：

```haskell
interactiveLines :: Int -> IO ()
interactiveLines counter = do
  line <- getLine
  putStrLn (show counter ++ ". " ++ line)
  interactiveLines (counter + 1)
```

我们可以使用 `show` 函数将任意数字转换为字符串，并在这里用它来转换计数器。在进入递归调用之前，我们递增计数器，以便显示下一个编号。

> 💡**注意**： `show` 函数可以用来将多种类型的值转换为字符串。在第 5 章中，当我们讨论类型类（type classes）时，会学习如何识别哪些类型可以使用 `show`。

需要理解的是，这种做法之所以可行，是因为我们构造了一个**会计算出 IO 动作的函数**。当然，这个函数的结果会根据传入的参数而变化。因此，对于每一个新的计数器值，我们实际上都在调用一个新的动作。仅仅在 `do` 块中调用 `interactiveLines` 是不够的，因为由于缺少参数，它**并不是一个 IO 动作**。简而言之，类型 `Int -> IO ()` **不是一个 IO 动作**！

### 3.1.3 跳出递归动作（Breaking out of a recursive action）

现在我们已经找到了一种实现“循环”的方法，那么接下来就需要找到一种**跳出循环**的办法。一个简单的终止条件是：当用户输入为空时，停止计数并退出循环。这可以通过使用 **`null` 函数**（用于检查列表是否为空）以及 **`if-then-else`** 结构来实现。目前我们可以假设 `null` 的类型为：`String -> Bool`。不过，我们还需要确定当列表（即输入）为空时该怎么做。当我们处在一个 **IO 动作的 `do` 块** 中时，**最后一个表达式必须是一个 IO 动作**。这意味着在 `if-then-else` 语句中，**两个分支都必须返回一个 IO 动作**。当然，如果输入不为空，我们可以简单地递归调用当前的动作；但如果输入为空呢？我们需要找到一种方法来生成一个**类型为 `IO ()`、但什么也不做的 IO 动作**。为此，我们可以使用一个非常有用的函数，名为 **`return`**：

```haskell
return :: a -> IO a
```

它可以用来**将一个值包装成一个 IO 动作**（其中 `a` 表示任意类型都可以被使用）。不过，你**不应该把这个 `return` 理解为从动作中“返回”**，因为实际上并不是这样。根据定义，**一个 IO 动作的返回值，是该动作中最后被求值的那个子动作的结果！**

```haskell
myAction :: IO Int
myAction = do
  return 1
  return 2
  return 3
```

这个动作的结果永远是 `3`，相当于：

```haskell
myAction :: IO Int
myAction = do
  _ <- return 1
  _ <- return 2
  return 3
```

通过使用 `_ <-`，我们只是**丢弃了返回的值**。这通常是我们对待类型为 `IO ()` 的动作的方式，因为这种类型的值**不包含任何有用信息**，我们并不关心它。

在我们的 `interactiveLines` 示例中，我们可以使用 `return` 函数来构造 **`else` 分支中的 IO 动作**。然而，当输入不为空时，我们需要执行两个 IO 动作。但要注意——**仅仅把两个 IO 动作上下写在一起并不会构成一个新的 IO 动作**。因此，必须将它们放在一个 **`do` 块** 中，因为 `do` 块本身**定义了一个新的 IO 动作**。如下所示的代码清单展示了这一点。

**清单 3.2 带计数的交互式输入（递归实现）**

```haskell
interactiveLines :: Int -> IO ()
interactiveLines counter = do
  line <- getLine          -- #1
  if null line             -- #2
    then return ()         -- #3
    else do                -- #4
      putStrLn (show counter ++ ". " ++ line)  -- #5
      interactiveLines (counter + 1)           -- #6
```

-  `--1`从输入读取一行
-  `--2`检查是否为空
-  `--3` 若为空，返回一个“什么都不做”的 IO 动作
-  `--4`否则开启新的 `do` 块
-  `--5`输出编号后的文本
-  `--6` 递归调用自身，计数器加 1

我们现在得到了第一个程序原型——一个简单但完整的 IO 动作演示。在 GHCi 中，可以用多行输入（`: { ... :}`）来测试它：

```haskell
ghci> :{
ghci| interactiveLines 1
ghci| :}
ghci> interactiveLines 1
Hello
1. Hello
IO
2. IO
Action
3. Action
ghci>
```

我们可以看到，输入一行文本后，它会被打印出来，**唯独空行不会**。在 GHCi 中使用 IO 动作的行为与在普通程序中略有不同。请记住，**GHCi 会对输入的语句立即求值**，因此，只要在命令行中**输入一个 IO 类型的语句**，它就会被执行：

```haskell
ghci> getLine
Hello
"Hello"
```

当 IO 动作返回的不是 `()` 时（例如返回字符串），GHCi 会自动打印出返回值。

