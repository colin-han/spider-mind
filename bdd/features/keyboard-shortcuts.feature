Feature: 思维导图键盘快捷键操作
  """
  需求背景：
  - 用户在编辑思维导图时需要高效的键盘操作支持
  - 快捷键能显著提升节点创建、编辑、删除和导航的效率
  - 键盘操作应该与鼠标操作保持一致的功能和结果
  - 不同编辑状态下的快捷键行为应该符合用户直觉

  功能目标：
  - Tab键添加子节点，快速扩展思维结构
  - Enter键添加同级节点，快速平行扩展
  - Delete键删除节点，快速清理不需要的内容
  - F2键进入编辑模式，快速修改节点内容
  - 方向键节点导航，快速在思维导图中移动焦点

  技术要点：
  - 快捷键监听通过document keydown事件实现
  - 区分编辑模式和选中模式下的快捷键行为
  - 节点选中状态通过ReactFlow的selected属性控制
  - 新节点的ID使用UUID保证唯一性
  - 节点导航基于树形结构的层次关系

  操作规则：
  - Tab键：为选中节点添加子节点，自动选中新子节点
  - Enter键：添加同级节点放在当前节点下方，自动选中新节点
  - Delete键：不允许删除根节点，删除其他节点需确认，删除后焦点移到父节点
  - F2键：进入节点编辑模式
  - 方向键：左右键在父子间导航，上下键在同级节点间导航，边界时无效
  - Escape键：退出编辑模式，节点保持选中状态
  """

  Background:
    Given 我是一个已登录的用户
    And 我已经打开了一个思维导图
    And 节点"root"应该被选中

  # Tab键 - 添加子节点测试
  Scenario: Tab键为选中节点添加子节点
    Given 节点"root"应该被选中
    When 我按下Tab键
    Then 节点"root"应该有1个子节点
    And 节点"root-0"应该存在
    And 节点"root-0"应该是节点"root"的子节点
    And 节点"root-0"应该被选中

  Scenario: Tab键为子节点添加子节点创建孙节点
    Given 我为节点"root"添加子节点
    And 节点"root-0"应该被选中
    When 我按下Tab键
    Then 节点"root-0"应该有1个子节点
    And 节点"root-0-0"应该存在
    And 节点"root-0-0"应该是节点"root-0"的子节点
    And 节点"root-0-0"应该被选中

  Scenario: 连续使用Tab键创建多层子节点
    Given 节点"root"应该被选中
    When 我按下Tab键
    Then 节点"root-0"应该被选中
    When 我按下Tab键
    Then 节点"root-0-0"应该被选中
    And 节点"root"应该有1个子节点
    And 节点"root-0"应该有1个子节点

  # Enter键 - 添加同级节点测试
  Scenario: Enter键为根节点添加同级节点
    Given 节点"root"应该被选中
    When 我按下Enter键
    Then 节点"root-sibling-1"应该存在
    And 节点"root-sibling-1"应该被选中
    And 节点"root"应该不被选中

  Scenario: Enter键为子节点添加同级节点
    Given 我为节点"root"添加子节点
    And 节点"root-0"应该被选中
    When 我按下Enter键
    Then 节点"root-1"应该存在
    And 节点"root-1"应该是节点"root"的子节点
    And 节点"root-1"应该被选中
    And 节点"root"应该有2个子节点

  Scenario: 连续使用Enter键创建多个同级节点
    Given 节点"root"应该被选中
    When 我按下Enter键
    Then 节点"root-sibling-1"应该被选中
    When 我按下Enter键
    Then 节点"root-sibling-2"应该存在
    And 节点"root-sibling-2"应该被选中

  # Delete键 - 删除节点测试
  Scenario: Delete键尝试删除根节点应该被阻止
    Given 节点"root"应该被选中
    When 我按下Delete键
    Then 应该显示提示信息"根节点不能被删除"
    And 节点"root"应该存在
    And 节点"root"应该被选中

  Scenario: Delete键删除子节点需要确认
    Given 我为节点"root"添加子节点
    And 节点"root-0"应该被选中
    When 我按下Delete键
    Then 系统显示删除确认对话框
    And 对话框内容包含"确定要删除这个节点吗？"

  Scenario: 确认删除节点后焦点移到父节点
    Given 我为节点"root"添加子节点
    And 节点"root-0"应该被选中
    When 我按下Delete键
    And 我按下Enter键
    Then 节点"root-0"应该不存在
    And 节点"root"应该被选中
    And 节点"root"应该有0个子节点

  Scenario: 取消删除操作保持原状态
    Given 我为节点"root"添加子节点
    And 节点"root-0"应该被选中
    When 我按下Delete键
    And 我按下Escape键
    Then 删除确认对话框关闭
    And 节点"root-0"应该存在
    And 节点"root-0"应该被选中

  Scenario: 删除有子节点的节点
    Given 我为节点"root"添加子节点
    And 我选中节点"root-0"
    And 我为节点"root-0"添加子节点
    And 节点"root-0"应该被选中
    When 我按下Delete键
    And 我按下Enter键
    Then 节点"root-0"应该不存在
    And 节点"root-0-0"应该不存在
    And 节点"root"应该被选中

  # F2键 - 进入编辑模式测试
  Scenario: F2键进入节点编辑模式
    Given 节点"root"应该被选中
    When 我按下F2键
    Then 节点"root"应该处于编辑状态

  Scenario: F2键在子节点上进入编辑模式
    Given 我为节点"root"添加子节点
    And 节点"root-0"应该被选中
    When 我按下F2键
    Then 节点"root-0"应该处于编辑状态

  # Escape键 - 退出编辑模式测试
  Scenario: Escape键退出编辑模式保持选中状态
    Given 节点"root"应该被选中
    When 我按下F2键
    Then 节点"root"应该处于编辑状态
    When 我按下Escape键
    Then 节点"root"应该不处于编辑状态
    And 节点"root"应该被选中

  Scenario: 编辑模式下输入内容后Escape键保存并退出
    Given 节点"root"应该被选中
    When 我按下F2键
    And 我输入"编辑后的根节点内容"
    And 我按下Escape键
    Then 节点"root"应该不处于编辑状态
    And 节点"root"的内容应该是"编辑后的根节点内容"
    And 节点"root"应该被选中

  # 方向键导航测试
  Scenario: 右方向键从父节点导航到子节点
    Given 我为节点"root"添加子节点
    And 节点"root"应该被选中
    When 我按下"右"方向键
    Then 节点"root-0"应该被选中
    And 节点"root"应该不被选中

  Scenario: 左方向键从子节点导航到父节点
    Given 我为节点"root"添加子节点
    And 节点"root-0"应该被选中
    When 我按下"左"方向键
    Then 节点"root"应该被选中
    And 节点"root-0"应该不被选中

  Scenario: 下方向键在同级节点间向下导航
    Given 我为节点"root"添加子节点
    And 我选中节点"root-0"
    And 我按下Enter键
    And 节点"root-1"应该被选中
    When 我按下"上"方向键
    Then 节点"root-0"应该被选中
    And 节点"root-1"应该不被选中

  Scenario: 上方向键在同级节点间向上导航
    Given 我为节点"root"添加子节点
    And 我选中节点"root-0"
    And 我按下Enter键
    And 节点"root-0"应该被选中
    When 我按下"下"方向键
    Then 节点"root-1"应该被选中
    And 节点"root-0"应该不被选中

  Scenario: 到达边界时方向键导航无效
    Given 节点"root"应该被选中
    When 我按下"左"方向键
    Then 节点"root"应该被选中
    When 我按下"上"方向键
    Then 节点"root"应该被选中

  Scenario: 右方向键在叶节点时导航无效
    Given 我为节点"root"添加子节点
    And 节点"root-0"应该被选中
    When 我按下"右"方向键
    Then 节点"root-0"应该被选中

  # 编辑模式下快捷键行为测试
  Scenario: 编辑模式下快捷键被禁用
    Given 节点"root"应该被选中
    When 我按下F2键
    Then 节点"root"应该处于编辑状态
    When 我按下Tab键
    Then 不应该创建任何新节点
    And 节点"root"应该处于编辑状态

  Scenario: 编辑模式下方向键不导航节点
    Given 我为节点"root"添加子节点
    And 节点"root"应该被选中
    When 我按下F2键
    Then 节点"root"应该处于编辑状态
    When 我按下"右"方向键
    Then 节点"root"应该处于编辑状态
    And 节点"root-0"应该不被选中

  Scenario: 编辑模式下Delete键不删除节点
    Given 我为节点"root"添加子节点
    And 节点"root-0"应该被选中
    When 我按下F2键
    Then 节点"root-0"应该处于编辑状态
    When 我按下Delete键
    Then 节点"root-0"应该存在
    And 节点"root-0"应该处于编辑状态

  # 复杂场景测试
  Scenario: 复合操作创建复杂思维导图结构
    Given 节点"root"应该被选中
    When 我按下Tab键
    Then 节点"root-0"应该被选中
    When 我按下Enter键
    Then 节点"root-1"应该被选中
    When 我按下Tab键
    Then 节点"root-1-0"应该被选中
    When 我按下"左"方向键
    Then 节点"root-1"应该被选中
    When 我按下"上"方向键
    Then 节点"root-0"应要被选中

  Scenario: 快速编辑多个节点内容
    Given 节点"root"应该被选中
    When 我按下F2键
    And 我输入"主题"
    And 我按下Escape键
    Then 节点"root"的内容应该是"主题"
    When 我按下Tab键
    And 我按下F2键
    And 我输入"子主题1"
    And 我按下Escape键
    Then 节点"root-0"的内容应该是"子主题1"

  Scenario: 无选中节点时快捷键无效
    Given 节点"root"应该被选中
    When 我点击思维导图的空白区域取消所有节点选中
    And 我按下Tab键
    Then 不应该创建任何新节点
    When 我按下Enter键
    Then 不应该创建任何新节点
    When 我按下Delete键
    Then 不应该显示删除确认对话框

# === 状态追踪 ===
# 创建时间: 2025-08-10 [当前时间]
# 最后更新: 2025-08-10 [当前时间]
# 状态: 🔄 需求已确认，等待Steps实现
# 需要实现的快捷键功能:
#   - Tab键：添加子节点 + 自动选中
#   - Enter键：添加同级节点(下方) + 自动选中
#   - Delete键：删除节点(根节点保护) + 确认对话框 + 焦点移父节点
#   - F2键：进入编辑模式
#   - Escape键：退出编辑模式，保持选中
#   - 方向键：左右父子导航，上下同级导航，边界无效
#   - 编辑模式下禁用导航和创建快捷键
#
# 技术要求:
# - 使用document keydown事件监听
# - 区分编辑模式和选中模式
# - 基于ReactFlow的selected属性
# - 新节点UUID生成
# - 树形结构导航算法