// 使用 localStorage 模拟数据库
const STORAGE_KEY = 'my_forum_posts';

// 1. 获取所有帖子
function getPosts() {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

// 2. 保存帖子到本地
function savePosts(posts) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
}

// 3. 防 XSS 攻击（将用户输入的 HTML 标签转义）
function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

// 4. 渲染帖子列表
function renderPosts() {
  const posts = getPosts();
  const listEl = document.getElementById('post-list');
  
  if (posts.length === 0) {
    listEl.innerHTML = '<div class="empty-state">暂无帖子，快来发布第一条吧！</div>';
    return;
  }

  // 按时间倒序排列
  posts.sort((a, b) => b.id - a.id);

  listEl.innerHTML = posts.map(post => `
    <div class="post-item">
      <div class="post-title">${escapeHTML(post.title)}</div>
      <div class="post-meta">${escapeHTML(post.author)} · ${post.time}</div>
      <div class="post-content">${escapeHTML(post.content)}</div>
    </div>
  `).join('');
}

// 5. 发布新帖逻辑
document.getElementById('submit-btn').addEventListener('click', () => {
  const titleInput = document.getElementById('post-title');
  const contentInput = document.getElementById('post-content');
  const authorInput = document.getElementById('post-author');

  const title = titleInput.value.trim();
  const content = contentInput.value.trim();
  const author = authorInput.value.trim() || '匿名用户';

  if (!title) {
    alert('请输入帖子标题！');
    titleInput.focus();
    return;
  }
  if (!content) {
    alert('请输入帖子内容！');
    contentInput.focus();
    return;
  }

  const posts = getPosts();
  const newPost = {
    id: Date.now(), // 使用时间戳作为唯一ID
    title: title,
    content: content,
    author: author,
    time: new Date().toLocaleString('zh-CN', { 
      year: 'numeric', month: '2-digit', day: '2-digit', 
      hour: '2-digit', minute: '2-digit' 
    })
  };

  posts.push(newPost);
  savePosts(posts);

  // 清空输入框
  titleInput.value = '';
  contentInput.value = '';
  authorInput.value = '';

  // 重新渲染
  renderPosts();
});

// 页面加载时初始化
renderPosts();