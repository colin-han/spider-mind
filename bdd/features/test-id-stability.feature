# Test-ID 稳定性验证
#
# 🚨 此feature文件专门用于验证test-id生成规则的稳定性
# 目的: 确保未来任何代码重构都不会破坏test-id的生成规律
# 重要性: 保护所有BDD测试的稳定性基础

Feature: Test-ID生成规则稳定性验证
  作为测试工程师和开发工程师
  我希望验证test-id生成规则的稳定性和一致性
  以便确保未来代码重构不会破坏现有测试

  Background:
    Given 我是一个已登录的用户

  Scenario: 节点test-id应该仅和节点位置相关
    Given 我创建一个新的思维导图如下：
      ```
      根节点
        子节点1
        子节点2
          孙子节点2-1
          孙子节点2-2
          孙子节点2-3
        子节点3
      ```
    When 我删除节点"root-1"
    Then 节点"root-1"的内容应该是"子节点3"
    And 节点"root-2"应该不存在

  Scenario: 孙子节点的test-id应该随之父节点而改变
    Given 我创建一个新的思维导图如下：
      ```
      根节点
        子节点1
        子节点2
          孙子节点2-1
          孙子节点2-2
          孙子节点2-3
        子节点3
      ```
    When 我删除节点"root-0"
    Then 节点"root-0"的内容应该是"子节点2"
    And 节点"root-1"的内容应该是"子节点3"
    And 节点"root-0-0"的内容应该是"孙子节点2-1"
    And 节点"root-0-1"的内容应该是"孙子节点2-2"
    And 节点"root-0-2"的内容应该是"孙子节点2-3"
    And 节点"root-1-1"应该不存在

  Scenario: root节点的兄弟节点应该是float节点
    Given 我点击"新建思维导图"按钮
    When 我按下Enter键
    Then 节点"float-0"应该存在
    And 我修改节点"float-0"的内容为"浮动节点1"
    When 我按下Enter键
    Then 节点"float-1"应该存在
    And 我修改节点"float-1"的内容为"浮动节点2"
    When 我按下Enter键
    Then 节点"float-2"应该存在
    And 我修改节点"float-2"的内容为"浮动节点3"
    When 我删除节点"float-1"
    Then 节点"float-1"的内容应该是"浮动节点3"
    And 节点"float-2"应该不存在
    
      
