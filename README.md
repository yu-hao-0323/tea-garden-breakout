# 茶园突围 · 双生守护

两位真人定制的 Q 版守护者，在茶园中迎战暗影的单人动作小游戏。

- 青锋：玉刃横扫、回风斩、万叶归刃。
- 灵叶：追踪飞叶、闪身回血、青岚结界。
- 两位角色各有待机、跑动、普攻、绝技动作序列，以及冲刺残影和受击反馈。
- 手机横屏操作；竖屏时阻止操作并暂停战斗。
- 灵露拾取、三选一升级、敌人波次和最终首领。

## 操作

手机：横屏后使用左侧摇杆移动、右侧按钮释放技能。

电脑：WASD / 方向键移动，Q / 空格释放技能一，E 释放技能二，Esc 暂停。

竖屏限制通过游戏界面和输入拦截实现。支持全屏方向锁定的浏览器会尝试切换横屏；其他浏览器需要关闭系统方向锁定并手动旋转手机。竖屏后返回横屏时，点击“继续战斗”恢复，避免意外受击。

## 本地运行

纯静态网页，无安装依赖。

```sh
python3 -m http.server 8080 --directory dist
```

访问 `http://localhost:8080`。角色资源使用本地路径加载，需通过 HTTP 服务运行。

## 检查

Node.js 22 或更高版本：

```sh
npm run check
npm test
```

检查包括角色技能、伤害时机、动作切换、升级暂停、胜负结算、横屏条件及资源路径；不包含真实手机浏览器测试。

## GitHub Pages

将项目推送至 GitHub 仓库的 `main` 分支，在仓库 **Settings → Pages → Source** 选择 **GitHub Actions**。运行 `.github/workflows/pages.yml`；它会检查游戏并将 `dist/` 发布到 Pages，成功地址由工作流的 deployment 输出提供。

工作流配置参考：[GitHub 官方 Pages 工作流文档](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。所有游戏资源使用相对地址，支持仓库子路径。

`.openai/hosting.json` 是原有 Sites 项目的身份配置；游戏与 Pages 工作流不依赖它，Pages 只上传 `dist/`。

## 资源

`dist/assets/` 中包含定制角色、茶园背景和两张 4×4 动作图集。动作图集在运行时进行透明合成并按实际画面边界取帧，保留了抬剑动作的完整武器。
