// ========== 本地存储初始化 ==========
const DB_USERS = 'forum_users';
const DB_POSTS = 'forum_posts';
const DB_CURRENT = 'forum_current_user';

// 初始化默认数据（内置 admin 账号）
function initDB() {
  if (!localStorage.getItem(DB_USERS)) {
    const defaultAdmin = {
      id: 'admin',
      username: 'admin',
      password: '123456', // 纯前端演示，明文密码，真实环境不可这样
      role: 'admin',
      badges: ['admin', 'verified']
    };
    localStorage.setItem(DB_USERS, JSON.stringify([defaultAdmin]));
  }
  if (!localStorage.getItem(DB_POSTS)) {
    localStorage.setItem(DB_POSTS, JSON.stringify([]));
  }
}
initDB();

// ========== 数据获取工具 ==========
const getUsers = () => JSON.parse(localStorage.getItem(DB_USERS));
const saveUsers = (users) => localStorage.setItem(DB_USERS, JSON.stringify(users));
const getPosts = () => JSON.parse(localStorage.getItem(DB_POSTS));
const savePosts = (posts) => localStorage.setItem(DB_POSTS, JSON.stringify(posts));
const getCurrentUser = () => JSON.parse(localStorage.getItem(DB_CURRENT));

// 防 XSS
function escapeHTML(str) {
  return String(str).replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag]));
}

// 渲染徽章 HTML
function renderBadges(badges) {
  if (!badges || badges.length === 0) return '';
  const map = {
    admin: '🛡️ 管理员',
    verified: '✅ 官方认证',
    active: '⭐ 活跃用户',
    vip: '👑 VIP'
  };
  return badges.map(b => `<span class="badge ${b}">${map[b]}</span>`).join('');
}

// ========== UI 渲染逻辑 ==========

// 1. 渲染顶部导航
function renderNav() {
  const nav = document.getElementById('nav-actions');
  const user = getCurrentUser();
  
  if (user) {
    nav.innerHTML = `
      <span>欢迎，<b>${escapeHTML(user.username)}</b></span>
      ${user.role === 'admin' ? '<button class="btn-admin" id="btn-open-admin">管理后台</button>' : ''}
      <button class="btn-logout" id="btn-logout">退出</button>
    `;
    document.getElementById('btn-logout').onclick = logout;
    if (user.role === 'admin') {
      document.getElementById('btn-open-admin').onclick = openAdminModal;
    }
  } else {
    nav.innerHTML = `
      <button class="btn-login" id="btn-open-login">登录</button>
      <button class="btn-register" id="btn-open-register">注册</button>
    `;
    document.getElementById('btn-open-login').onclick = () => openAuthModal('login');
    document.getElementById('btn-open-register').onclick = () => openAuthModal('register');
  }
}

// 2. 渲染发帖区和帖子列表
function renderMainContent() {
  const user = getCurrentUser();
  const createArea = document.getElementById('create-post-area');
  const promptArea = document.getElementById('login-prompt');

  if (user) {
    createArea.style.display = 'block';
    promptArea.style.display = 'none';
    document.getElementById('current-user-name').textContent = user.username;
  } else {
    createArea.style.display = 'none';
    promptArea.style.display = 'block';
  }

  const posts = getPosts().sort((a, b) => b.id - a.id);
  const listEl = document.getElementById('post-list');
  const users = getUsers();

  if (posts.length === 0) {
    listEl.innerHTML = '<div style="padding: 40px; text-align: center; color: #9ca3af;">暂无帖子，快来发布第一条吧！</div>';
    return;
  }

  listEl.innerHTML = posts.map(post => {
    // 查找发帖人当前的徽章
    const author = users.find(u => u.id === post.authorId);
    const badgesHTML = author ? renderBadges(author.badges) : '';

    return `
      <div class="post-item">
        <div class="post-header">
          <div class="post-title">${escapeHTML(post.title)}</div>
        </div>
        <div class="post-meta">
          <span>${escapeHTML(post.authorName)}</span>
          ${badgesHTML}
          <span>· ${post.time}</span>
        </div>
        <div class="post-content">${escapeHTML(post.content)}</div>
      </div>
    `;
  }).join('');
}

// ========== 交互逻辑 ==========

// 发布帖子
document.getElementById('submit-btn').addEventListener('click', () => {
  const user = getCurrentUser();
  if (!user) return;

  const title = document.getElementById('post-title').value.trim();
  const content = document.getElementById('post-content').value.trim();
  if (!title || !content) return alert('标题和内容不能为空');

  const posts = getPosts();
  posts.push({
    id: Date.now(),
    title,
    content,
    authorId: user.id,
    authorName: user.username,
    time: new Date().toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  });
  savePosts(posts);

  document.getElementById('post-title').value = '';
  document.getElementById('post-content').value = '';
  renderMainContent();
});

// 退出登录
function logout() {
  localStorage.removeItem(DB_CURRENT);
  renderNav();
  renderMainContent();
}

// ========== 登录/注册弹窗逻辑 ==========
let authMode = 'login'; // 'login' 或 'register'

function openAuthModal(mode) {
  authMode = mode;
  const modal = document.getElementById('auth-modal');
  document.getElementById('auth-title').textContent = mode === 'login' ? '登录' : '注册';
  document.getElementById('auth-submit-btn').textContent = mode === 'login' ? '登录' : '注册';
  document.getElementById('toggle-text').textContent = mode === 'login' ? '没有账号？去注册' : '已有账号？去登录';
  document.getElementById('auth-username').value = '';
  document.getElementById('auth-password').value = '';
  modal.classList.add('active');
}

document.getElementById('close-auth').onclick = () => document.getElementById('auth-modal').classList.remove('active');

document.getElementById('toggle-text').onclick = () => {
  openAuthModal(authMode === 'login' ? 'register' : 'login');
};

document.getElementById('auth-submit-btn').onclick = () => {
  const username = document.getElementById('auth-username').value.trim();
  const password = document.getElementById('auth-password').value.trim();
  if (!username || !password) return alert('用户名和密码不能为空');

  const users = getUsers();

  if (authMode === 'register') {
    if (users.find(u => u.username === username)) return alert('用户名已存在');
    const newUser = {
      id: Date.now().toString(),
      username,
      password,
      role: 'user',
      badges: ['active'] // 注册默认给个活跃徽章
    };
    users.push(newUser);
    saveUsers(users);
    alert('注册成功，请登录');
    openAuthModal('login');
  } else {
    const user = users.find(u => u.username === username && u.password === password);
    if (!user) return alert('用户名或密码错误');
    localStorage.setItem(DB_CURRENT, JSON.stringify(user));
    document.getElementById('auth-modal').classList.remove('active');
    renderNav();
    renderMainContent();
  }
};

// ========== 管理后台逻辑 ==========
function openAdminModal() {
  const modal = document.getElementById('admin-modal');
  modal.classList.add('active');
  renderAdminUsers();
  renderAdminPosts();
}

document.getElementById('close-admin').onclick = () => document.getElementById('admin-modal').classList.remove('active');

// 切换 Tab
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.getAttribute('data-tab');
    document.getElementById('admin-content-users').style.display = tab === 'users' ? 'block' : 'none';
    document.getElementById('admin-content-posts').style.display = tab === 'posts' ? 'block' : 'none';
  };
});

// 渲染用户管理列表
function renderAdminUsers() {
  const users = getUsers();
  const container = document.getElementById('admin-content-users');
  
  container.innerHTML = users.map(user => {
    // 徽章选择器
    const badgeTypes = ['admin', 'verified', 'active', 'vip'];
    const checkboxes = badgeTypes.map(type => {
      const isChecked = user.badges.includes(type) ? 'checked' : '';
      return `
        <input type="checkbox" id="badge-${user.id}-${type}" ${isChecked} onchange="toggleBadge('${user.id}', '${type}')">
        <label for="badge-${user.id}-${type}">${type}</label>
      `;
    }).join('');

    return `
      <div class="admin-user-item">
        <div>
          <b>${escapeHTML(user.username)}</b> <span style="font-size:12px;color:#6b7280;">(${user.role})</span>
        </div>
        <div class="badge-selector">
          ${checkboxes}
        </div>
      </div>
    `;
  }).join('');
}

// 给用户赋予/撤销徽章
window.toggleBadge = function(userId, badgeType) {
  const users = getUsers();
  const user = users.find(u => u.id === userId);
  if (user) {
    if (user.badges.includes(badgeType)) {
      user.badges = user.badges.filter(b => b !== badgeType);
    } else {
      user.badges.push(badgeType);
    }
    saveUsers(users);
    renderMainContent(); // 刷新帖子的徽章显示
  }
};

// 渲染帖子管理列表
function renderAdminPosts() {
  const posts = getPosts();
  const container = document.getElementById('admin-content-posts');
  
  if (posts.length === 0) {
    container.innerHTML = '<div style="padding:20px;text-align:center;color:#9ca3af;">暂无帖子</div>';
    return;
  }

  container.innerHTML = posts.map(post => `
    <div class="admin-post-item">
      <div>
        <b>${escapeHTML(post.title)}</b><br>
        <span style="font-size:12px;color:#6b7280;">作者: ${escapeHTML(post.authorName)}</span>
      </div>
      <button class="btn-danger" onclick="deletePost(${post.id})">删除</button>
    </div>
  `).join('');
}

// 删除帖子
window.deletePost = function(postId) {
  if (!confirm('确定要删除该帖子吗？')) return;
  const posts = getPosts().filter(p => p.id !== postId);
  savePosts(posts);
  renderAdminPosts();
  renderMainContent();
};

// ========== 启动 ==========
renderNav();
renderMainContent();