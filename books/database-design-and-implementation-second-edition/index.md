---
sidebar_position: 2
typora-root-url: ./..\..\static
---

# Database Design and Implementation Second Edition 中文翻译

## 简介

《Database Design and Implementation Second Edition》是一本深入探讨数据库系统设计与实现的经典著作。本项目旨在将该书翻译成中文，使中文读者能够更好地学习和理解数据库系统的核心概念。

## 目标读者

- 数据库系统开发者和工程师
- 计算机科学研究人员
- 文件系统开发者
- 对数据库内核设计感兴趣的工程师


## 内容目录

1. ### [前言 Preface](preface.md)

2. ### [第 1 章：数据库系统（Database Systems）](chapter1.md#数据库系统database-system)

   - [1.1 为什么要使用数据库系统？（Why a Database System?）](chapter1#11-为什么要使用数据库系统-why-a-database-system)
   - [1.2 Derby 数据库系统（The Derby Database System）](chapter1#12-derby-数据库系统-the-derby-database-system)
   - [1.3 数据库引擎（Database Engines）](chapter1#13-数据库引擎-database-engines)
   - [1.4 SimpleDB 数据库系统（The SimpleDB Database System）](chapter1#14-simpledb-数据库系统-the-simpledb-database-system)
   - [1.5 SimpleDB 版 SQL（The SimpleDB Version of SQL）](chapter1#15-simpledb-版本的-sql-the-simpledb-version-of-sql)
   - [1.6 本章小结（Chapter Summary）](chapter1#16-章总结-chapter-summary)
   - [1.7 建议阅读（Suggested Reading）](chapter1#17-建议阅读-suggested-reading)
   - [1.8 习题（Exercises）](chapter1#18-练习-exercises)

3. ### [第 2 章：JDBC（JDBC）](chapter2.md#jdbc)

   - [2.1 基本 JDBC（Basic JDBC）](chapter2#21-基础jdbc-basic-jdbc)
   - [2.2 高级 JDBC（Advanced JDBC）](chapter2#22-高级-jdbc-advanced-jdbc)
   - [2.3 Java 与 SQL 中的计算（Computing in Java vs. SQL）](chapter2#23-java-与-sql-中的计算-computing-in-java-vs-sql)
   - [2.4 本章小结（Chapter Summary）](chapter2#24-章节总结-chapter-summary)
   - [2.5 建议阅读（Suggested Reading）](chapter2#25-建议阅读-suggested-reading)
   - [2.6 习题（Exercises）](chapter2#26-练习-exercises)

4. ### [第 3 章：磁盘与文件管理（Disk and File Management）](chapter3.md#第-3-章-磁盘和文件管理-chapter-3-disk-and-file-management)

   - [3.1 持久化数据存储（Persistent Data Storage）](chapter3#31-持久数据存储-persistent-data-storage)
   - [3.2 块级磁盘接口（The Block-Level Interface to the Disk）](chapter3#32-磁盘的块级接口-the-block-level-interface-to-the-disk)
   - [3.3 文件级磁盘接口（The File-Level Interface to the Disk）](chapter3#33-磁盘的文件级接口-the-file-level-interface-to-the-disk)
   - [3.4 数据库系统与操作系统（The Database System and the OS）](chapter3#34-数据库系统与操作系统-the-database-system-and-the-os)
   - [3.5 SimpleDB 文件管理器（The SimpleDB File Manager）](chapter3#35-simpledb-文件管理器-the-simpledb-file-manager)
   - [3.6 本章小结（Chapter Summary）](chapter3#36-本章总结-chapter-summary)
   - [3.7 建议阅读（Suggested Reading）](chapter3#37-建议阅读-suggested-reading)
   - [3.8 习题（Exercises）](chapter3#38-练习-exercises)

5. ### [第 4 章：内存管理（Memory Management）](chapter4.md#第-4-章-内存管理-chapter-4-memory-management)

   - [4.1 数据库内存管理的两大原则（Two Principles of Database Memory Management）](chapter4#41-数据库内存管理的两个原则-two-principles-of-database-memory-management)
   - [4.2 日志信息管理（Managing Log Information）](chapter4#42-日志信息管理-managing-log-information)
   - [4.3 SimpleDB 日志管理器（The SimpleDB Log Manager）](chapter4#43-simpledb-日志管理器-the-simpledb-log-manager)
   - [4.4 用户数据管理（Managing User Data）](chapter4#44-用户数据管理-managing-user-data)
   - [4.5 SimpleDB 缓冲管理器（The SimpleDB Buffer Manager）](chapter4#45-simpledb-缓冲区管理器-the-simpledb-buffer-manager)
   - [4.6 本章小结（Chapter Summary）](chapter4#46-本章总结-chapter-summary)
   - [4.7 建议阅读（Suggested Reading）](chapter4#47-建议阅读-suggested-reading)
   - [4.8 习题（Exercises）](chapter4#48-练习-exercises)

6. ### [第 5 章：事务管理（Transaction Management）](chapter5.md#第-5-章-事务管理-chapter-5-transaction-management)

   - [5.1 事务（Transactions）](chapter5#51-事务-transactions)
   - [5.2 在 SimpleDB 中使用事务（Using Transactions in SimpleDB）](chapter5#52-在-simpledb-中使用事务-using-transactions-in-simpledb)
   - [5.3 恢复管理（Recovery Management）](chapter5#53-恢复管理-recovery-management)
   - [5.4 并发管理（Concurrency Management）](chapter5#54-并发管理-concurrency-management)
   - [5.5 实现 SimpleDB 事务（Implementing SimpleDB Transactions）](chapter5#55-实现-simpledb-事务-implementing-simpledb-transactions)
   - [5.6 本章小结（Chapter Summary）](chapter5#56-章节总结-chapter-summary)
   - [5.7 建议阅读（Suggested Reading）](chapter5#57-建议阅读-suggested-reading)
   - [5.8 习题（Exercises）](chapter5#58-练习-exercises)

7. ### [第 6 章：记录管理（Record Management）](chapter6.md#第-6-章-记录管理-record-management)

   - [6.1 记录管理器设计（Designing a Record Manager）](chapter6#61-设计记录管理器-designing-a-record-manager)
   - [6.2 记录文件的实现（Implementing a File of Records）](chapter6#62-实现记录文件-implementing-a-file-of-records)
   - [6.3 SimpleDB 记录页（SimpleDB Record Pages）](chapter6#63-simpledb-记录页面-simpledb-record-pages)
   - [6.4 SimpleDB 表扫描（SimpleDB Table Scans）](chapter6#64-simpledb-表扫描-simpledb-table-scans)
   - [6.5 本章小结（Chapter Summary）](chapter6#65-章总结-chapter-summary)
   - [6.6 建议阅读（Suggested Reading）](chapter6#66-建议阅读-suggested-reading)
   - [6.7 习题（Exercises）](chapter6#67-练习-exercises)

8. ### [第 7 章：元数据管理（Metadata Management）](chapter7.md#第-7-章-元数据管理metadata-management)

   - [7.1 元数据管理器（The Metadata Manager）](chapter7#71-元数据管理器-the-metadata-manager)
   - [7.2 表元数据（Table Metadata）](chapter7#72-表元数据-table-metadata)
   - [7.3 视图元数据（View Metadata）]()
   - [7.4 统计元数据（Statistical Metadata）](chapter7#73-视图元数据-view-metadata)
   - [7.5 索引元数据（Index Metadata）](chapter7#75-索引元数据-index-metadata)
   - [7.6 实现元数据管理器（Implementing the Metadata Manager）]()
   - [7.7 本章小结（Chapter Summary）](chapter7#76-实现元数据管理器-implementing-the-metadata-manager)
   - [7.8 建议阅读（Suggested Reading）](chapter7#78-建议阅读-suggested-reading)
   - [7.9 习题（Exercises）](chapter7#79-练习-exercises)

9. ### [第 8 章：查询处理（Query Processing）](chapter8.md#第-8-章-查询处理query-processing)

   - [8.1 关系代数（Relational Algebra）](chapter8#81-关系代数-relational-algebra)
   - [8.2 扫描（Scans）](chapter8#82-扫描-scans)
   - [8.3 更新扫描（Update Scans）](chapter8#83-更新扫描-update-scans)
   - [8.4 扫描的实现（Implementing Scans）](chapter8#84-实现扫描-implementing-scans)
   - [8.5 管道化查询处理（Pipelined Query Processing）](chapter8#85-管道化查询处理-pipelined-query-processing)
   - [8.6 谓词（Predicates）](chapter8#86-谓词-predicates)
   - [8.7 本章小结（Chapter Summary）](chapter8#87-章总结-chapter-summary)
   - [8.8 建议阅读（Suggested Reading）](chapter8#88-建议阅读suggested-reading)
   - [8.9 习题（Exercises）](chapter8#89-练习exercises)

10. ### [第 9 章：解析（Parsing）](chapter9.md#第-9-章-解析-parsing)

    - [9.1 语法与语义（Syntax Versus Semantics）](chapter9#91-语法与语义-syntax-versus-semantics)
    - [9.2 词法分析（Lexical Analysis）](chapter9#92-词法分析-lexical-analysis)
    - [9.3 SimpleDB 词法分析器（The SimpleDB Lexical Analyzer）](chapter9#93--simpledb的词法分析器-the-simpledb-lexical-analyzer)
    - [9.4 文法（Grammars）](chapter9#94-语法-grammars)
    - [9.5 递归下降解析器（Recursive-Descent Parsers）](chapter9#95-递归下降解析器-recursive-descent-parsers)
    - [9.6 在解析器中添加动作（Adding Actions to the Parser）](chapter9#96-为解析器添加动作-adding-actions-to-the-parser)
    - [9.7 本章小结（Chapter Summary）](chapter9#97-章总结-chapter-summary)
    - [9.8 建议阅读（Suggested Reading）](chapter9#98-建议阅读-suggested-reading)
    - [9.9 习题（Exercises）](chapter9#99-练习-exercises)


11. ### [第 10 章：查询规划（Planning）](chapter10.md#第-10-章-规划-planning)

    - [10.1 验证（Verification）](chapter10#101-验证-verification)
    - [10.2 查询树评估成本（The Cost of Evaluating a Query Tree）](chapter10#102-评估查询树的成本-the-cost-of-evaluating-a-query-tree)
    - [10.3 执行计划（Plans）](chapter10#103-计划-plans)
    - [10.4 查询计划（Query Planning）](chapter10#104-查询计划-query-planning)
    - [10.5 更新计划（Update Planning）](chapter10#105-更新规划update-planning)
    - [10.6 SimpleDB 规划器（The SimpleDB Planner）](chapter10#106-simpledb-的规划器the-simpledb-planner)
    - [10.7 本章小结（Chapter Summary）](chapter10#107-本章小结chapter-summary)
    - [10.8 建议阅读（Suggested Reading）](chapter10#108-推荐阅读suggested-reading)
    - [10.9 习题（Exercises）](chapter10#109-练习exercises)

12. ### [第 11 章：JDBC 接口（JDBC Interfaces）](chapter11.md#第-11-章-jdbc-接口-jdbc-interfaces)

    - [11.1 SimpleDB API（The SimpleDB API）](chapter11#111-simpledb-api-the-simpledb-api)
    - [11.2 嵌入式 JDBC（Embedded JDBC）](chapter11#112-嵌入式-jdbc-embedded-jdbc)
    - [11.3 远程方法调用（Remote Method Invocation）](chapter11#113-远程方法调用-remote-method-invocation)
    - [11.4 远程接口的实现（Implementing the Remote Interfaces）](chapter11#114-实现远程接口-implementing-the-remote-interfaces)
    - [11.5 JDBC 接口的实现（Implementing the JDBC Interfaces）](chapter11#115-实现-jdbc-接口-implementing-the-jdbc-interfaces)
    - [11.6 本章小结（Chapter Summary）](chapter11#116-章总结-chapter-summary)
    - [11.7 建议阅读（Suggested Reading）](chapter11#117-建议阅读-suggested-reading)
    - [11.8 习题（Exercises）](chapter11#118-练习-exercises)

13. ### 索引（Indexing）

    - 12.1 索引的价值（The Value of Indexing）
    - 12.2 SimpleDB 索引（SimpleDB Indexes）
    - 12.3 静态哈希索引（Static Hash Indexes）
    - 12.4 可扩展哈希索引（Extendable Hash Indexes）
    - 12.5 B 树索引（B-Tree Indexes）
    - 12.6 索引感知的操作实现（Index-Aware Operator Implementations）
    - 12.7 索引更新规划（Index Update Planning）
    - 12.8 本章小结（Chapter Summary）
    - 12.9 建议阅读（Suggested Reading）
    - 12.10 习题（Exercises）

14. ### 物化与排序（Materialization and Sorting）

    - 13.1 物化的价值（The Value of Materialization）
    - 13.2 临时表（Temporary Tables）
    - 13.3 物化（Materialization）
    - 13.4 排序（Sorting）
    - 13.5 分组与聚合（Grouping and Aggregation）
    - 13.6 归并连接（Merge Joins）
    - 13.7 本章小结（Chapter Summary）
    - 13.8 建议阅读（Suggested Reading）
    - 13.9 习题（Exercises）

15. ### 高效缓冲利用（Effective Buffer Utilization）

    - 14.1 查询计划中的缓冲使用（Buffer Usage in Query Plans）
    - 14.2 多缓冲排序（Multibuffer Sorting）
    - 14.3 多缓冲笛卡尔积（Multibuffer Product）
    - 14.4 缓冲分配策略（Determining Buffer Allocation）
    - 14.5 多缓冲排序的实现（Implementing Multibuffer Sorting）
    - 14.6 多缓冲笛卡尔积的实现（Implementing Multibuffer Product）
    - 14.7 哈希连接（Hash Joins）
    - 14.8 连接算法比较（Comparing the Join Algorithms）
    - 14.9 本章小结（Chapter Summary）
    - 14.10 建议阅读（Suggested Reading）
    - 14.11 习题（Exercises）

16. ### 查询优化（Query Optimization）

    - 15.1 等价查询树（Equivalent Query Trees）
    - 15.2 查询优化的必要性（The Need for Query Optimization）
    - 15.3 查询优化器结构（The Structure of a Query Optimizer）
    - 15.4 寻找最优查询树（Finding the Most Promising Query Tree）
    - 15.5 寻找最高效执行计划（Finding the Most Efficient Plan）
    - 15.6 优化的两阶段结合（Combining the Two Stages of Optimization）
    - 15.7 查询块合并（Merging Query Blocks）
    - 15.8 本章小结（Chapter Summary）
    - 15.9 建议阅读（Suggested Reading）
    - 15.10 习题（Exercises）

## 配套源码
[SimpleDB](https://github.com/BruceBlink/simpledb)

## 翻译进度

- [x] 第1章：数据库系统（Database Systems）
- [x] 第2章：JDBC
- [x] 第3章：磁盘与文件管理（Disk and File Management）
- [x] 第4章：内存管理（Memory Management）
- [x] 第5章： 事务管理（Transaction Management）
- [x] 第6章： 记录管理（Record Management）
- [x] 第7章： 元数据管理（Metadata Management）
- [x] 第8章： 查询处理（Query Processing）
- [x] 第9章： 解析（Parsing）
- [ ] 第10章： 查询计划（Planning）
- [x] 第11章：  JDBC 接口（JDBC Interfaces）
- [ ] 第12章： 索引（Indexing）
- [ ] 第13章：物化与排序（Materialization and Sorting）
- [ ] 第14章： 高效缓冲利用（Effective Buffer Utilization）
- [ ] 第15章： 查询优化（Query Optimization）

## 参与贡献

我们欢迎各种形式的贡献，包括但不限于：

- 翻译新的章节
- 校对已翻译的内容
- 改进项目文档
- 报告问题或提出建议

