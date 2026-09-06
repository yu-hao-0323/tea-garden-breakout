# 山间小院

中文休闲经营游戏：种植、茶点制作、订单、自由摆设、伙伴分工与四阶段扩建。

## 运行与验证

- `npm ci`
- `npm run build`
- `npm test`
- `npx tsc --noEmit`

使用 Vinext + React、Cloudflare Workers 和 D1。`.openai/hosting.json` 的 DB 为逻辑绑定；数据库迁移在 `drizzle/`，由 Sites 发布应用。

账号只需独一无二的名字与密码。PBKDF2 密码摘要、哈希会话、一次性轮换的找回码均在服务端；安全 cookie 不向前端暴露令牌。存档由服务端时间推进，离线收益最多 8 小时。每个操作使用请求 ID 防止重复扣款，修订号比较更新防止设备间覆盖。找回密码原子更新密码与找回码并撤销旧会话。

`tests/game.test.mjs` 使用内存 SQLite 运行实际 API 与迁移，覆盖账号隔离、恢复、幂等及核心经营流程；页面渲染测试只替换 Cloudflare 平台绑定。新建站点按默认权限仅向创建者发布，游戏内账号不改变站点外层访问权限。

## GitHub Pages 站内前端

`node node_modules/vite/bin/vite.js build --config vite.pages.config.ts` 输出 `pages-dist/`，发布到现有大厅的 `dist/courtyard/`。React 页面和素材均由 GitHub Pages 提供，账号和存档调用独立 Worker API。页面不嵌入或跳转到 ChatGPT。API 仅向 `https://yu-hao-0323.github.io` 返回跨域许可；会话令牌存放在当前标签页 sessionStorage，存档仍仅在 D1。关闭标签页后重新登录即可继续存档。API 外层访问权限仍需由站点所有者明确开放后才能服务 GitHub Pages 的跨域请求。
