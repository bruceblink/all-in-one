---
sidebar_position: 3
typora-root-url: ./..\..\static
---

# Learn Haskell by Example 中文翻译

## 简介

《Learn Haskell by Example》的目标是通过构建实用应用而非枯燥的练习，从零开始教授 Haskell。
人们常常把 Haskell 看作一门纯粹的学术语言——让我们打破这种先入为主的观念！Haskell 的实用性完全能够满足我们的需求。

通过专注于语言的实际应用，读者将更深入地理解 Haskell 的内在与基础优势，并看到它那些优雅的抽象不仅仅是理论上的思维实验，而是真正可用于现实工作的强大工具。

## 目标读者

本书适合那些**已经掌握至少一种编程语言**， 并希望**尝试使用 Haskell 进行函数式编程**的程序员和软件工程师。 
之前是否接触过函数式编程**不是必要条件**。 本书虽然**不是 Haskell 的全面教程**，
但它可以作为一个**入门指南**， 帮助读者首先、**也是最重要的一点——让读者能够编写属于自己的Haskell代码**。



## 内容目录
1. ### [第1章 - 引言（Introduction）](chapter1.md#引言introduction)

    - [1.1 什么是 Haskell？（What is Haskell?）](chapter1#11-什么是-haskellwhat-is-haskell)
        - [1.1.1 抽象与理论（Abstraction and theory）](chapter1#111-抽象与理论abstraction-and-theory)
        - [1.1.2 一个安全的环境（A safe place）](chapter1#112-一个安全的环境a-safe-place)
    - [1.2 纯函数式之道（The pure functional way）](chapter1#12-纯函数式之道the-pure-functional-way)
        - [1.2.1 声明式“食谱”（A declarative recipe）](chapter1#121-声明式食谱a-declarative-recipe)
        - [1.2.2 从蛋糕到程序（From cake to program）](chapter1#122-从蛋糕到程序from-cake-to-program)
        - [1.2.3 一切都是为了简单（It’s all for simplicity）](chapter1#123-一切都是为了简单its-all-for-simplicity)
    - [1.3 抽象的使用（Usage of abstraction）](chapter1#13-抽象的使用usage-of-abstraction)
        - [1.3.1 优点（The good parts）](chapter1#131-优点the-good-parts)
        - [1.3.2 缺点（The bad parts）](chapter1#132-缺点the-bad-parts)
    - [1.4 我们所学到的（The things we learn）](chapter1#14-我们所学到的the-things-we-learn)
    - [总结（Summary）](chapter1#总结summary)

2. ### [第2章 - 古老的秘密在现代机器上延续（Ancient secret keeping on modern machines）](chapter2.md#古老的秘密在现代机器上延续ancient-secret-keeping-on-modern-machines)

    - [2.1 Haskell 入门（A primer on Haskell）](chapter2#21-haskell-入门a-primer-on-haskell)
        - [2.1.1 凯撒密码（Caesar’s cipher）](chapter2#211-凯撒密码caesars-cipher)
        - [2.1.2 新项目（A new project）](chapter2#212-新建项目a-new-project)
        - [2.1.3 第一个模块（The first module）](chapter2#213-第一个模块the-first-module)
    - [2.2 典型类型与奇妙函数（Typical types and fantastic functions）](chapter2#22-常见类型与奇妙函数typical-types-and-fantastic-functions)
        - [2.2.1 原子级类型（Types on the atomic level）](chapter2#221-原子级别的类型types-on-the-atomic-level)
        - [2.2.2 列表与元组（Lists and tuples）](chapter2#222-列表与元组lists-and-tuples)
        - [2.2.3 函数类型（Function types）](chapter2#223-函数类型function-types)
        - [2.2.4 给数学运算加上类型（Adding types to math）](chapter2#224-给数学运算加上类型adding-types-to-math)
    - [2.3 关于字母表的一点帮助（A little help with the alphabet）](chapter2#23-关于字母表的一点帮助a-little-help-with-the-alphabet)
        - [2.3.1 可读性同义类型（Synonymous types for readability）](chapter2#231-为可读性定义同义类型synonymous-types-for-readability)
        - [2.3.2 字母的种类（The kinds of letters）](chapter2#232-字母的类型the-kinds-of-letters)
        - [2.3.3 逻辑组合（Logical combinations）](chapter2#233-逻辑组合logical-combinations)
    - [2.4 转动轮子（Rotating the wheel）](chapter2#24-旋转转盘rotating-the-wheel)
        - [2.4.1 查找元素索引（Finding an element’s index）](chapter2#241-查找元素的索引finding-an-elements-index)
        - [2.4.2 查找索引处的元素（Finding the element at an index）](chapter2#242-查找给定索引处的元素)
        - [2.4.3 控制流保护（Guarding control flow）](chapter2#243-使用守卫控制流程guarding-control-flow)
    - [2.5 转换字符串（Transforming a string）](chapter2#25-转换字符串transforming-a-string)
        - [2.5.1 高阶映射（A higher-order mapping）](chapter2#251-高阶映射a-higher-order-mapping)
        - [2.5.2 参数化类型（Parameterizing types）](chapter2#252-参数化类型parameterizing-types)
        - [2.5.3 完整的凯撒密码（A finished cipher）](chapter2#253-完整的凯撒密码a-finished-cipher)
    - [总结（Summary）](chapter2#总结summary)

3. ### [第3章 - 每一行都至关重要（Every line counts）](chapter3.md#每一行都至关重要every-line-counts)

    - [3.1 与外部交互（Talking to the outside）](chapter3#31-与外部交互talking-to-the-outside)
        - [3.1.1 简单输入输出（Simple actions for input and output）](chapter3#311--简单输入输出simple-actions-for-input-and-output)
        - [3.1.2 模拟循环（Simulating a loop）](chapter3#312-模拟循环simulating-a-loop)
        - [3.1.3 跳出递归动作（Breaking out of a recursive action）](chapter3#313-跳出递归动作breaking-out-of-a-recursive-action)
    - [3.2 动作中的纯函数（Pure functions inside of actions）](chapter3#32-动作中的纯函数pure-functions-inside-of-actions)
        - [3.2.1 读取与修改用户输入（Reading and modifying user input）](chapter3#321-读取与修改用户输入reading-and-modifying-user-input)
        - [3.2.2 纯代码与非纯代码的数据流（Data flow between pure and impure code）](chapter3#322-纯代码与非纯代码之间的数据流data-flow-between-pure-and-impure-code)
    - [3.3 从环境中读取数据（Reading from the environment）](chapter3#33-从环境中读取数据reading-from-the-environment)
        - [3.3.1 解析命令行参数（Parsing command line arguments）](chapter3#331-解析命令行参数parsing-command-line-arguments)
        - [3.3.2 用 `Maybe` 表示错误（Encoding errors with Maybe）](chapter3#332-用-maybe-表示错误encoding-errors-with-maybe)
    - [3.4 示例：读取并打印命令行参数（Example: Reading and printing a command line argument）](chapter3#34-示例读取并打印命令行参数example-reading-and-printing-a-command-line-argument)
        - [3.4.1 let 关键字（The let keyword）](chapter3#341-let-关键字)
        - [3.4.2 使用 stack 运行程序（Running the program with stack）](chapter3#342-使用-stack-运行程序running-the-program-with-stack)

4. ### [第4章 - 行号工具（Line numbering tool）](chapter4.md#line-numbering-tool)

    - 4.1 文件读取与内容转换（Reading files and transforming their content）
        - 4.1.1 编写纯库（Writing a pure library）
        - 4.1.2 隐藏辅助参数（Hiding auxiliary arguments）
    - 4.2 高阶函数的参数化行为（Parametrized behavior in higher-order functions）
        - 4.2.1 函数部分应用（Partial function application）
    - 4.3 代数数据结构作为可能性的编码（Algebraic data structures as an encoding of possibilities）
        - 4.3.1 求和类型或标记联合（Sum types or tagged unions）
        - 4.3.2 不要重复自己（Don’t repeat yourself）
        - 4.3.3 zip 函数（The zip function）
        - 4.3.4 处理缺失值（Working with missing values）
        - 4.3.5 使用 mapM 打印值列表（Printing a list of values with mapM）
    - 4.4 从库到可执行程序（From library to executable）
        - 4.4.1 命令行选项编码与解析（Encoding and parsing command line options）
        - 4.4.2 项目概览（An overview of the project）

5. ### [第5章 - 单词与图（Words and graphs）](chapter5.md#单词与图words-and-graphs)

    - 5.1 构建图（Building a graph）
        - 5.1.1 多态类型（Polymorphic types）
        - 5.1.2 新模块介绍（Introducing a new module）
        - 5.1.3 Eq 类型类与类型约束（The Eq type class and type constraints）
        - 5.1.4 flip 函数（The flip function）
    - 5.2 封装实现（Encapsulating implementations）
        - 5.2.1 添加与删除条目（Adding and removing entries）
        - 5.2.2 使用导出列表隐藏构造器（Using export lists to hide constructors）
        - 5.2.3 Show 类型类（The Show type class）
    - 5.3 使用与复用代码（Using and reusing code）
        - 5.3.1 限定导入（Qualified imports）
        - 5.3.2 为排列构建映射（Building maps for permutations）
        - 5.3.3 从字典创建排列映射（Creating a permutation map from a dictionary）
    - 5.4 转换参数化（Parameterizing transformations）
        - 5.4.1 列表推导（List comprehensions）

6. ### [第6章 - 解梯子游戏（Solving the ladder game）](chapter6.md#解梯子游戏solving-the-ladder-game)

    - 6.1 构建广度优先搜索（Constructing a breadth-first search）
        - 6.1.1 算法概述（Overview of the algorithm）
        - 6.1.2 跟踪搜索状态（Keeping track of search state）
        - 6.1.3 回溯查找解（Finding the solution by backtracking）
    - 6.2 类型变量作用域（Type variable scoping）
        - 6.2.1 泛型量化（Universal quantification）
        - 6.2.2 语言扩展（Language extensions）
        - 6.2.3 使用词法作用域类型变量（Using lexically scoped type variables）
    - 6.3 使用哈希表提升性能（Improving performance with hashmaps）
        - 6.3.1 性能分析与 profiling（Analyzing performance with profiling）
        - 6.3.2 添加项目依赖（Adding project dependencies）
        - 6.3.3 惰性求值（Lazy evaluation）

7. ### [第7章 - 处理 CSV 文件（Working with CSV files）](chapter7.md#处理-csv-文件working-with-csv-files)

    - 7.1 建模 CSV 数据（Modeling CSV data）
        - 7.1.1 记录语法（Record syntax）
        - 7.1.2 使用 Either 编码错误（Encoding errors with Either）
    - 7.2 智能构造器（Smart constructors）
        - 7.2.1 构造时保证属性（Ensuring a property at the time of construction）
        - 7.2.2 提供不安全的替代方案（Providing an unsafe alternative）
        - 7.2.3 美元符号操作符（The dollar sign operator）
    - 7.3 使用类型类（Using type classes）
        - 7.3.1 Semigroup 与 Monoid
        - 7.3.2 IsString 类型类
    - 7.4 创建新的类型类（Creating a new type class）
        - 7.4.1 数据结构切片的类型类（A type class for slicing data structures）
        - 7.4.2 模块重导出（Re-exporting modules）

8. ### [第8章 - CSV 工具（A tool for CSV）](chapter8.md#csv-工具a-tool-for-csv)

    - 8.1 数据解析（Parsing data）
        - 8.1.1 数值解析（Parsing numeric values）
    - 8.2 数据结构折叠（Folding data structures）
        - 8.2.1 折叠概念（The concept of folding）
        - 8.2.2 解析结构（A structure for parsing）
        - 8.2.3 Functor 类型类（The Functor type class）
        - 8.2.4 使用折叠解析（Using folding for parsing）
    - 8.3 打印 CSV（Printing a CSV）
        - 8.3.1 CSV 操作（Operations on CSVs）
    - 8.4 简单命令行解析器（A simple command-line parser）
        - 8.4.1 支持标志与复杂参数（Supporting flags and complicated arguments）

9. ### [第9章 - 快速检查与随机测试（Quick checks and random tests）](chapter9.md#快速检查与随机测试quick-checks-and-random-tests)

    - 9.1 如何测试（How to test）
        - 9.1.1 属性测试（Property testing）
        - 9.1.2 生成随机值（Generating random values）
        - 9.1.3 Random 与 Uniform
        - 9.1.4 使用全局随机生成器（Using a global random value generator）
        - 9.1.5 基础属性测试（A basic property test）
        - 9.1.6 为随机值定义后置条件（Defining postconditions for random values）
    - 9.2 随机化测试（Randomized testing）
        - 9.2.1 引用透明性的好处（The benefit of referential transparency）
    - 9.3 QuickCheck 测试框架（The QuickCheck testing framework）
        - 9.3.1 在 QuickCheck 中使用 Property
    - 9.4 为测试生成随机值（Generating random values for testing）
        - 9.4.1 Genrandom 值函数（The random generator Genrandom value function）
        - 9.4.2 示例：AssocMap
        - 9.4.3 测试用例缩减（Shrinking test cases）
    - 9.5 属性测试的实际使用（Practical usage of property testing）
        - 9.5.1 冗余与覆盖报告（Verbosity and coverage reports）
        - 9.5.2 修改测试参数（Modifying a test’s parameters）
        - 9.5.3 构建测试套件（Constructing test suites）
        - 9.5.4 测试有效性（The effectiveness of testing）

10. ### [第10章 - 数字音乐盒（Digital music box）](chapter10.md#数字音乐盒digital-music-box)

    - 10.1 用数字建模声音（Modeling sound with numbers）
        - 10.1.1 数值类型类的“动物园”（The zoo of numeric type classes）
        - 10.1.2 创建周期函数（Creating periodic functions）
    - 10.2 使用无限列表（Using infinite lists）
        - 10.2.1 ADSR（Attack, decay, sustain, release）
        - 10.2.2 构建与操作无限列表（Building and working with infinite lists）
    - 10.3 控制合成（Controlling synthesis）
        - 10.3.1 部分字段选择器（Partial field selectors）
        - 10.3.2 函数作为类型（A function as a type）
    - 10.4 音符模型（Note models）
        - 10.4.1 音高类型类（A type class for pitches）
        - 10.4.2 Ratio 类型
        - 10.4.3 不同类型的指数运算（Different kinds of exponentiation）

11. ### [第11章 - 编程音乐作品（Programming musical compositions）](chapter11.md#编程音乐作品programming-musical-compositions)

    - 11.1 多类型多态数据结构（Polymorphic data structures with multiple types）
        - 11.1.1 存在量化（Existential quantification）
        - 11.1.2 使用存在量化类型（Using existentially quantified types）
    - 11.2 结构解释（Interpreting structures）
        - 11.2.1 混合信号（Mixing signals）
        - 11.2.2 多声部组（Groups of polyphony）
    - 11.3 实现领域特定语言（Implementing a domain-specific language）
        - 11.3.1 简化语法（Simplifying syntax）
        - 11.3.2 自定义操作符用于类列表数据结构（Custom operators for list-like data structures）
        - 11.3.3 Fixity 声明（Fixity declarations）

12. ### [第12章 - 解析像素数据（Parsing pixel data）](chapter12.md#解析像素数据parsing-pixel-data)

    - 12.1 编写解析器（Writing a parser）
        - 12.1.1 可移植的历史图像（Portable images from the past）
        - 12.1.2 如何解析文件（How to parse a file）
        - 12.1.3 合成效果（Composing effects）
        - 12.1.4 选择性替代（Choosing alternatively）
        - 12.1.5 引入单子（Introducing monads）
        - 12.1.6 关于单子的讨论（A discussion on monads）
        - 12.1.7 如何失败（How to fail）
    - 12.2 大规模解析（Parsing on a bigger scale）
        - 12.2.1 Attoparsec 简介（An introduction to Attoparsec）
        - 12.2.2 图像解析（Parsing images）
        - 12.2.3 格式选择（Choosing between formats）
        - 12.2.4 组合解析器（Putting parsers together）

13. ### [第13章 - 并行图像处理（Parallel image processing）](chapter13.md#并行图像处理parallel-image-processing)

    - 13.1 向调用者提供类型信息（Providing type information to the caller）
        - 13.1.1 返回类型多态性问题（Problems with return-type polymorphism）
        - 13.1.2 泛化代数数据类型（Generalized algebraic data types）
        - 13.1.3 Vector 类型
        - 13.1.4 使用存在量化的动态类型（Dynamic types with existential quantification）
    - 13.2 解析数据验证（Validation of parsed data）
    - 13.3 通用图像转换算法（A generic algorithm for image conversion）
        - 13.3.1 图像转换矩阵算法（Image algorithm for conversion matrices）
        - 13.3.2 导出图像为 PNG（Exporting images as PNG）
    - 13.4 使用并行处理转换数据（Using parallelism to transform data）
        - 13.4.1 时间测量（Measuring time）
        - 13.4.2 并行原理（How parallelism works）
        - 13.4.3 Sparks 图像处理 HECs（Haskell execution contexts）

14. ### [第14章 - 文件与异常（Files and exceptions）](chapter14.md#文件与异常files-and-exceptions)

    - 14.1 打开和读取文件（Opening and reading files）
        - 14.1.1 System.IO 与 Handle
        - 14.1.2 缓冲与定位（Buffering and Seeking）
    - 14.2 从文件读取字节（Reading bytes from a file）
        - 14.2.1 资源获取与 bracket（Resource acquisition and bracket）
    - 14.3 文件系统与异常（Working with the filesystem and exceptions）
        - 14.3.1 System.Directory 与 System.FilePath
        - 14.3.2 列出文件与目录（Listing files and directories）
        - 14.3.3 异常基础（The basics of exceptions）
    - 14.4 抛出与捕获异常（Throwing and catching exceptions）
        - 14.4.1 错误处理（Handling an error）

15. ### [第15章 - 同步的转换器（Transformers for synchronizing）](chapter15.md#同步的转换器transformers-for-synchronizing)

    - 15.1 Monad 转换器（Monad transformers）
        - 15.1.1 使用 ReaderT 读取环境（Reading an environment with ReaderT）
        - 15.1.2 StateT 与 WriterT
        - 15.1.3 使用 RWST 堆叠多个转换器（Stacking multiple transformers with RWST）
    - 15.2 应用程序实现（Implementing an application）
    - 15.3 提供命令行接口（Providing a CLI）
        - 15.3.1 使用 optparse-applicative 解析参数（Parsing arguments with optparse-applicative）
        - 15.3.2 枚举自定义类型（Enumerating custom types）
        - 15.3.3 Enum 类
        - 15.3.4 App 的命令行接口（A CLI for App）

16. ### [第16章 - JSON 与 SQL（JSON and SQL）](chapter16.md#json-与-sqljson-and-sql)

    - 16.1 将值编码为 JSON（Encoding values as JSON）
        - 16.1.1 Aeson 与 JSON 解析（Aeson and JSON parsing）
        - 16.1.2 JSON 序列化（Serializing to JSON）
    - 16.2 使用 Generic 推导类型类（Deriving type classes with Generic）
    - 16.3 使用 SQLite 数据库（Using a SQLite database）
        - 16.3.1 sqlite-simple 基础
        - 16.3.2 ToRow 与 FromRow
        - 16.3.3 定义数据库访问动作（Defining actions for database access）

17. ### [第17章 - 使用 Servant 构建 API（APIs using Servant）](chapter17.md#使用-servant-构建-apiapis-using-servant)

    - 17.1 定义类型安全 API（Defining a typesafe API）
        - 17.1.1 使用 Servant 的类型化 API（Typed APIs with Servant）
        - 17.1.2 幻影类型（Phantom types）
        - 17.1.3 实现 API（Implementing the API）
    - 17.2 运行应用程序（Running the application）
        - 17.2.1 WAI 应用程序（The WAI application）
        - 17.2.2 应用中间件（Application middleware）
        - 17.2.3 从数据生成 HTML（Producing HTML from data）
    - 17.3 客户端生成（Deriving a client）
        - 17.3.1 使用 servant-client
        - 17.3.2 为 CLI 定义命令（Defining commands for the CLI）
        - 17.3.3 实现客户端（Implementing the client）

18. ### [附录 A Haskell 工具链（The Haskell Toolchain）](appendixA.md#附录-a-haskell-工具链the-haskell-toolchain)

    - A.1 工具与编辑器选择（Choosing tools and editor）
    - A.2 安装 Haskell 工具（Installing Haskell tools）
        - A.2.1 运行 Stack 与 GHCi（Running Stack and GHCi）
        - A.2.2 安装其他工具（Installing other tools）
    - A.3 一体化 Docker 文件（All in one Docker file）

19. ### [附录 B 惰性求值（Lazy evaluation）](appendixB.md#附录-b-惰性求值lazy-evaluation)

    - B.1 惰性数据结构（Lazy data structures）
    - B.2 原理（How it works）
    - B.3 空间与时间泄露（Leaking space and time）
    - B.4 undefined 与 newtype


## 翻译进度

- [x] 第1章：引言（Introduction）
- [x] 第2章：古老的秘密在现代机器上（Ancient secret keeping on modern machines）
- [x] 第3章：每行都重要（Every line counts）
- [ ] 第4章：行号工具（Line numbering tool）
- [ ] 第5章：单词与图（Words and graphs）
- [ ] 第6章：解梯子游戏（Solving the ladder game）
- [ ] 第7章：处理 CSV 文件（Working with CSV files）
- [ ] 第8章：CSV 工具（A tool for CSV）
- [ ] 第9章：快速检查与随机测试（Quick checks and random tests）
- [ ] 第10章：数字音乐盒（Digital music box）
- [ ] 第11章：编程音乐作品（Programming musical compositions）
- [ ] 第12章：解析像素数据（Parsing pixel data）
- [ ] 第13章：并行图像处理（Parallel image processing）
- [ ] 第14章：文件与异常（Files and exceptions）
- [ ] 第15章：同步的转换器（Transformers for synchronizing）
- [ ] 第16章：JSON 与 SQL（JSON and SQL）
- [ ] 第17章：使用 Servant 构建 API（APIs using Servant）
- [ ] 附录 A Haskell 工具链（The Haskell Toolchain）
- [ ] 附录 B 惰性求值（Lazy evaluation）

## 参与贡献

我们欢迎各种形式的贡献，包括但不限于：

- 翻译新的章节
- 校对已翻译的内容
- 改进项目文档
- 报告问题或提出建议
