---
sidebar_position: 5
typora-root-url: ./..\..\static
---
# 第 4 章 - 行号工具（Line numbering tool）
本章内容包括：

* 从文件系统读取文件
* 通过函数参数对高阶函数的行为进行参数化
* 使用代数数据结构来编码可选项
* 将代码打包为可执行程序

在上一章中，我们为一个可以对文件内容进行行号编号的工具打下了基础。我们已经学会了如何从用户那里读取参数。因此，现在可以开始考虑如何从文件中读取数据，以及如何获取文件内容中的各个行。

本章将从“读取文件并转换内容”开始，然后编写一个通用函数，其控制流与数据流由作为参数传入的函数决定。接着，我们将学习如何使用代数数据结构来表达程序选项，并最终完成上一章中的工具。

## 4.1 文件读取与内容转换（Reading files and transforming their content）

为了完成这个任务，我们需要一个执行 IO 操作的动作。Haskell 提供了两个最基本的文件操作函数：

```haskell
readFile :: FilePath -> IO String
writeFile :: FilePath -> String -> IO ()
```

顾名思义，`readFile` 从文件中读取内容，并将整个文件内容作为一个字符串返回；而 `writeFile` 接收一个字符串并将其写入到指定文件中，如果文件不存在则会自动创建。

这里我们又一次看到使用类型同义词（如 `FilePath`）的意义。仅从类型名就能明确知道参数的含义。如果直接使用 `String` 类型，这一点就不太明显。仅通过类型声明，我们就能推断出这些函数的大致用途。

接下来我们要使用 `readFile` 来构建一个能返回文件行列表的动作。为此，需要将文件内容按换行符 `\n` 进行分割。幸运的是，Haskell 为我们提供了一个现成的函数 `lines`，它正好可以做到这一点：

```haskell
ghci> :t lines
lines :: String -> [String]
ghci> lines "Hello\nWorld\n"
["Hello","World"]
```

如你所见，`lines` 会把字符串按行分割，并自动去掉换行符。它还有一个反函数 `unlines`，几乎执行相反的操作：

```haskell
ghci> :t unlines
unlines :: [String] -> String
ghci> unlines ["Hello", "World"]
"Hello\nWorld\n"
ghci> unlines (lines "Hello\nWorld")
"Hello\nWorld\n"
```

`unlines` 会在每个字符串后都加上一个换行符；而 `lines` 则会忽略输入字符串末尾是否缺少换行符。

除了这两个函数之外，还有 `words` 与 `unwords`，它们可以按空格分割（或重新拼接）字符串。所有这些函数都在 `Data.String` 模块中定义；但我们不需要显式导入，因为它们已通过 `Prelude` 导出，而 `Prelude` 是每个 Haskell 程序默认导入的模块。

> 💡 注意：`Prelude` 会重新导出来自不同模块的重要函数。例如，`readFile` 和 `writeFile` 实际上最初定义于 `System.IO` 模块。由于 `Prelude` 默认导入，我们不必显式引入 `System.IO`。当然，也可以通过编译器标志或 pragma 禁用 `Prelude` 的自动导入，但通常没有必要。

现在，我们可以编写一个动作，使用 `readFile` 和 `lines` 来读取文件的每一行。我们先读取文件内容，然后将其传给 `lines` 函数并返回结果。如下所示：

```haskell
-- 代码清单 4.1：读取文件行的动作
readLines :: FilePath -> IO [String]
readLines filePath = do
  contents <- readFile filePath      -- #1 读取指定路径下的整个文件内容
  return (lines contents)            -- #2 将文件内容按换行符分割为行列表
```

需要注意的是，如果文件不存在，此操作会抛出异常。这对我们来说没问题，因为错误信息足以提示用户出了什么问题，我们不需要额外处理这种错误。

在项目目录下创建一个名为 `testFile.txt` 的文件，并写入以下内容：

```
Hello
dear
reader!
```

然后启动 REPL（使用 `stack repl`），执行我们的动作：

```haskell
ghci> readLines "testFile.txt"
["Hello","dear","reader!"]
```

很好！现在我们就可以开始为这些行添加行号了！

### 4.1.1 编写纯库（Writing a pure library）

现在我们可以把注意力转向项目中的 **Lib 模块**。由于给行编号的代码本身相当通用，因此理应保存在库模块中。在前面，我们已经处理了程序中的许多不纯（impure）部分，现在可以专注于编写纯代码（pure code）了——这部分逻辑应该更容易理解。

首先，让我们看看希望支持哪些功能：我们希望能够对**每一行**进行编号，或仅对**满足某个条件**（谓词）的行编号，例如行非空或包含某个子字符串。因此，我们需要一个函数，能够为行生成对应的行号映射。此外，我们还希望支持**不同格式的行号显示**，例如左对齐或右对齐。为此，在进行格式化之前，我们必须先收集所有行号，以计算所需的填充长度。

我们先思考如何用数据类型表示这种“从行号到行内容”的映射。我们知道必须支持把任意数量的数字映射到行内容上。同时，映射的顺序也很重要，因为我们要知道打印时的顺序。列表（`List`）几乎能满足所有需求——它可以有任意长度，且顺序固定。但问题是：**如何在列表中表示一个映射？**答案就是**关联列表（associative list）**。关联列表的每个元素代表一个键值映射。而最简单的键值组合方式就是**二元组（tuple）**，它可以把两个不同类型的值放在一起。

因此，一个可能的类型定义如下：

```haskell
type NumberedLines = [(Int, String)]
```

这样，我们就能用它来表示行号与行内容的对应关系。

> 💡 注意
>  关联列表非常灵活，可以用来构建多种映射结构。
>  不过，它们的算法在运行时复杂度上通常比较高，因为大多数情况下查找键都需要遍历整个列表。
>  但如果性能不是主要关注点，关联列表依然是一种非常方便的数据结构。

举个例子：

```haskell
[(1, "First Line"), (2, "Second Line"), (3, "Third Line")]
```

不过，这种表示方式并不能完全满足我们的需求。因为我们希望能选择性地给某些行编号——也就是说，有些行可能**没有行号**。因此，我们需要一种能表达“某行可能没有编号”的类型。幸运的是，我们之前已经见过可以表示“缺失值”的类型：`Maybe`。我们可以这样定义：

```haskell
type NumberedLine = (Maybe Int, String)
type NumberedLines = [NumberedLine]
```

这样，一个行元素包含一个**可选的行号**和行内容的字符串。而所有的编号行就是这些映射组成的列表。

> 💡 注意
>  在这里我们看到，`Maybe` 不仅能用于捕获错误，也能用于表达“可选值”。
>  许多其他语言也有类似 Haskell `Maybe` 的类型，通常被称为 `Option` 或类似的名字。

------

既然我们已经有了表示行号的类型，那么就可以考虑需要构造哪些函数了。我们需要一个函数来生成行号；但它还必须能够**跳过**某些行的编号。此外，我们还需要一个选项，用来控制**何时递增行号**——因为“计数行数”和“编号行”是两个不同的概念。例如，我们可能想跳过空行，但**是否仍然计数**这些空行？如图 4.1 所示，这两种方式的区别很明显——理想情况下，这应该由用户自行配置。

> ![figure4-1](/img/learn-haskell-by-example/chapter4/figure4-1.png)
>
> 图 4.1：不同方式的空行编号）

正如我们在上一章学到的，高阶函数（higher-order functions）可以接收其他函数作为参数，这些参数函数能够有效地参数化其行为。
 由于我们需要为“何时忽略行”和“何时编号”定义复杂规则，因此这正是编写**高阶函数**的好机会——
 这个函数可以接收两个谓词参数，分别控制“何时递增编号”和“何时给行编号”。

### 4.1.2 隐藏辅助参数（Hiding auxiliary arguments）

我们先从最简单的情况开始——编写一个函数，给**每一行**编号，不带任何条件。然后我们再逐步改进。先考虑类型：我们接收一个字符串列表（即各行文本）作为输入，需要生成前面定义的 `NumberedLines`。那行号计数器该怎么处理？我们要不要把它作为参数暴露出去？理想情况下不应该——因为我们希望从 1 开始编号。但如果我们想递归地实现这个函数，就必须有办法在递归调用中传递“递增后的计数器”。我们需要的是一个**在外部函数内部定义的隐藏函数**。可以使用 `let` 绑定来实现，如下图所示：

**代码清单 4.2：包含局部函数定义的函数结构**

```haskell
numberAllLines :: [String] -> NumberedLines
numberAllLines lines =
  let go :: Int -> [String] -> NumberedLines      -- #1 使用 `let` 定义了一个局部函数
      go counter lines = ...
   in go 1 lines                                 -- #2 调用局部函数
```

这与我们之前看到的 `let` 稍有不同。那是因为 `let` 在与 `do` 表达式配合使用时的语义不一样。在**纯函数**中，`let` 用来创建局部定义（这些定义可以互相引用），并通过 `in` 关键字将它们引入作用域，如图 4.2 所示。定义的顺序无关紧要。

> ![figure4-2](/img/learn-haskell-by-example/chapter4/figure4-2.png)
>
> 图 4.2：`let` 绑定的语法结构

因此，我们可以使用 `let` 创建一个不同类型签名的内部函数，然后在主函数中调用它。内部函数可以拥有比外部函数更多（或完全不同）的参数。这样，我们就能在递归函数中**隐藏默认参数**，比如下面示例中的计数器变量。

> 💡 注意
>  当为这种局部函数起名时，通常使用 `go` 或 `aux`（即 auxiliary 的缩写）。这表示该函数只是某个更大定义的一部分。

------

现在我们可以递归地增加计数器了。每次递归调用都会创建一个新的行号映射，并在行号加一后继续处理下一行。最终结果是通过连接新生成的映射（`(Maybe Int, String)` 元组）与递归调用结果构成的列表。

**代码清单 4.3：给每一行编号的函数**

```haskell
numberAllLines :: [String] -> NumberedLines
numberAllLines lines =
  let go :: Int -> [String] -> NumberedLines     -- #1 局部函数的类型签名
      go _ [] = []                               -- #2 当输入为空列表时返回空列表（递归终止条件）
      go counter (x : xs) = (Just counter, x) : go (counter + 1) xs -- #3为当前行创建新的编号映射，并递归处理剩余行
   in go 1 lines                                 -- #4 调用辅助函数，并传入初始行号 1
```

在这个例子中，`go` 函数在第一个模式中使用了通配符 `_` 作为参数。为什么？因为在这一分支（空列表情况）中不需要使用计数器变量，
因此我们不必为它命名。在不需要某个参数时使用 `_` 是一个良好的习惯。

------

#### **练习：行与单词（Lines and Words）**

`lines`、`unlines`、`words` 和 `unwords` 是处理字符串时非常有用的函数。请尝试使用**递归定义**自行实现这些函数！记住，`String` 其实就是 `Char` 的列表，因此你可以对其进行模式匹配。同时，可以使用 `let` 在函数中引入带有额外参数的内部定义，并配合守卫（guards）来实现这些功能。现在我们已经有了一个可以给传入的所有行编号的函数。我们可以在 GHCi 中测试它：

```haskell
ghci> numberAllLines ["Hello", "", "World"]
[(Just 1,"Hello"),(Just 2,""),(Just 3,"World")]
```

## 4.2 高阶函数中的参数化行为（Parametrized behavior in higher-order functions）

接下来我们来解决检测空行的问题。我们希望给用户提供一个选项：是否为这些空行编号。但这意味着我们首先要能检测出空行。当然，如果一行是空的（不包含任何字符），我们可以认为它是空行。然而，如果这一行只包含控制字符（无法打印）或空白字符呢？在这种情况下，我们也应该把它视为空行。我们需要的是一个**谓词函数**，用于判断一个字符串是否应被视为空。换句话说，它是一个返回布尔值的函数。要检测字符串中是否包含控制字符或空白字符，我们可以使用 `Data.Char` 模块中的一些实用函数：

- `isPrint` 判断字符是否可打印；
- `isSeparator` 判断字符是否为空白符或其他 Unicode 分隔符。

```haskell
ghci> import Data.Char
ghci> isPrint 'a'
True
ghci> isPrint '\n'
False
ghci> isSeparator ' '
True
ghci> isSeparator 'a'
False
```

我们可以利用这些函数构建一个谓词，用来检测字符串是否为空或仅由不可打印字符组成。为此，可以使用 `all` 函数，它用于检查列表中所有元素是否满足给定谓词：

```haskell
ghci> all (\x -> x == 1) [1,1,1 :: Int]
True
ghci> all (\x -> x == 1) [1,1,2 :: Int]
False
```

我们可以据此编写一个函数：若字符串为空，或者仅包含不可打印字符或空白符，则返回 `True`。该函数如下所示：

**代码清单 4.4：检测字符串中是否至少包含一个可打印字符的谓词**

```haskell
isEmpty :: String -> Bool
isEmpty str =
  null str                     -- #1
    || all (\s -> not (isPrint s) || isSeparator s) str   -- #2
```

- \#1 若字符串为空，则返回 `True`；
- \#2 若字符串仅包含不可打印字符或分隔符，也返回 `True`。

现在我们可以测试这个函数：

```haskell
ghci> isEmpty "Test"
False
ghci> isEmpty "    "
True
ghci> isEmpty "\n  "
True
ghci> isEmpty "A   "
False
```

此外，我们还可以定义它的对偶函数，用于检查字符串**是否非空**：

```haskell
isNotEmpty :: String -> Bool
isNotEmpty str = not (isEmpty str)
```

现在，我们可以开始修改行号函数。由于我们想基于字符串的谓词来控制流程，因此我们已经知道新函数参数的类型应为 `String -> Bool`。我们需要两个谓词：

- 一个用于判断是否应递增计数器；
- 一个用于判断是否应为某行编号。

新的函数签名如下：

```haskell
numberLines :: (String -> Bool) -> (String -> Bool) -> [String] -> NumberedLines
numberLines shouldIncr shouldNumber text = ...
```

我们将函数改名为 `numberLines`，因为它现在是一个通用的行编号函数。在函数定义中，我们可以用 `if-then-else` 语句在 `let` 绑定里控制是为某行编号、是否递增计数器，或两者都不做。代码如下：

**代码清单 4.5：通用的高阶行编号函数**

```haskell
numberLines :: (String -> Bool) -> (String -> Bool) -> [String] -> NumberedLines
numberLines shouldIncr shouldNumber text =
  let go :: Int -> [String] -> NumberedLines         -- #1
      go _ [] = []                                  -- #2
      go counter (x : xs) =
        let mNumbering = if shouldNumber x then Just counter else Nothing  -- #3
            newCounter = if shouldIncr x then counter + 1 else counter     -- #4
         in (mNumbering, x) : go newCounter xs                             -- #5
   in go 1 text                                                           -- #6
```

- \#1 局部定义的函数类型签名；
- \#2 当输入列表为空时返回空列表，即递归终止条件；
- \#3 若谓词判断应编号，则为当前行赋予编号；
- \#4 若谓词判断应计数，则递增计数器；
- \#5 使用新变量递归调用；
- \#6 以固定初始值 `1` 调用辅助函数。

通过这些谓词，我们可以控制计数与编号行为。由此，我们能基于该函数构建不同变体。

### 4.2.1 部分函数应用（Partial Function Application）

为了定义一个“给所有行编号”的函数，我们需要两个始终返回 `True` 的函数，因为我们总是想计数并编号。我们可以这样写：

```haskell
(\_ -> True)
```

这个函数会忽略输入并始终返回 `True`。但我们还可以更一般地写出一个函数，它始终返回某个常量，并忽略第二个参数：

```haskell
const :: a -> b -> a
const x = (\_ -> x)
```

现在，表达式 `const True` 与之前的 `(\_ -> True)` 等价。注意它的类型签名：我们使用了两个自由类型变量。通过让第二个参数的类型为 `b`，我们说明它可以与第一个参数类型不同。我们可以把这个函数改写成更常见的形式：

```haskell
const :: a -> b -> a
const x _ = x
```

这样，我们得到一个可以生成常量一元函数的通用函数。实际上，这个函数在 Haskell 中已经存在！于是我们可以用它来定义 `numberAllLines`：

```haskell
numberAllLines :: [String] -> NumberedLines
numberAllLines text = numberLines (const True) (const True) text
```

看起来有些奇怪：`const True` 明明是一个二元函数，为什么只传了一个参数？这就是**部分函数应用**（partial application）的威力。在 Haskell（以及许多其他函数式语言）中，你不必一次性提供函数的所有参数；若缺少参数，表达式会计算为另一个仍然“等待”缺失参数的函数。例如，当我们有表达式 `(\x -> f x)` 时，可以执行 **η（eta）化简**：它会被简化为 `f`。这种化简可以重复应用于多参数函数，使得我们能写出极为简洁的定义。让我们看看 `const` 的例子： `const True` 等价于 `(\_ -> True)`，其类型由 `const :: a -> b -> a` 推得：第一个参数是 `True`，所以 `a` 的类型是 `Bool`，最终类型为：

```
b -> Bool
```

也就是说，它接受任意类型的参数并返回 `Bool`，这完全合理，因为参数被忽略了。

我们甚至可以对 `numberAllLines` 再进行一次 η 化简：

```haskell
numberAllLines :: [String] -> NumberedLines
numberAllLines = numberLines (const True) (const True)
```

从类型上看也完全吻合：`numberLines` 的类型是`(String -> Bool) -> (String -> Bool) -> [String] -> NumberedLines`，
 而 `const True` 的类型是 `b -> Bool`。将 `b` 替换为 `String` 后，结果类型正好是 `[String] -> NumberedLines`。

> 💡 **提示：**
>  η 化简是一种让函数定义更简洁的好方法。
>  它在 Haskell 代码中极为常见。虽然不是必须使用，但熟悉它能帮助你更轻松地阅读他人的代码。

我们可以测试 `numberAllLines` 是否正常工作：

```haskell
numberAllLines ["Hello", "", "World", "!"]
[(Just 1,"Hello"),(Just 2,""),(Just 3,"World"),(Just 4,"!")]
```

确实，所有行都被编号了。但我们并非为了这种简单情况才泛化函数——让我们来忽略一些行吧。

**练习：使用 η 化简**

上一章的项目实现时没有使用 η 化简，以便语法更易理解。
 现在你已经了解了这种化简，请查看项目源码，看看哪些地方可以进行 η 化简。

接下来我们编写一个函数：它对每一行都递增计数器，但**不为空行编号**。我们可以继续使用 `numberLines` 的两个谓词参数：第一个应始终返回 `True`（总是计数），第二个则应是我们之前定义的“非空行”谓词。

```haskell
numberNonEmptyLines :: [String] -> NumberedLines
numberNonEmptyLines = numberLines (const True) isNotEmpty
```

同样，我们使用 η 化简避免写出 `[String]` 参数。测试如下：

```haskell
ghci> numberNonEmptyLines ["Hello", "", "World", "!"]
[(Just 1,"Hello"),(Nothing,""),(Just 3,"World"),(Just 4,"!")]
```

我们始终递增计数器，但不为空行编号。再写一个版本：既不为空行编号，也不在空行上递增计数器。

```haskell
numberAndIncrementNonEmptyLines :: [String] -> NumberedLines
numberAndIncrementNonEmptyLines = numberLines isNotEmpty isNotEmpty
```

测试结果：

```haskell
ghci> numberAndIncrementNonEmptyLines ["Hello", "", "World", "!"]
[(Just 1,"Hello"),(Nothing,""),(Just 2,"World"),(Just 3,"!")]
```

至此，我们从通用定义（代码清单 4.5）派生出了三个功能差异明显的函数，概述如下：

**代码清单 4.6：根据不同条件为行编号的三种变体**

```haskell
numberAllLines :: [String] -> NumberedLines
numberAllLines = numberLines (const True) (const True)          -- #1

numberNonEmptyLines :: [String] -> NumberedLines
numberNonEmptyLines = numberLines (const True) isNotEmpty       -- #2

numberAndIncrementNonEmptyLines :: [String] -> NumberedLines
numberAndIncrementNonEmptyLines = numberLines isNotEmpty isNotEmpty  -- #3
```

- \#1 为每一行编号；
- \#2 仅为非空行编号，但空行也会计数；
- \#3 仅为非空行编号，空行既不编号也不计数。

通过这些定义，我们可以清楚地看到，只需编写简单的布尔谓词，就能灵活地控制何时为行编号、何时递增行号。
