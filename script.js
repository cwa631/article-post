
// ---------------------------
// Configuration
// ---------------------------
// Simple demo admin credentials (client-side). Change these if needed.
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123'; // change this before deployment
// ---------------------------

// utility
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const nowText = () => {
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    const hh = d.getHours();
    const ampm = hh >= 12 ? 'PM' : 'AM';
    const h12 = ((hh + 11) % 12) + 1;
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(h12)}:${pad(d.getMinutes())} ${ampm}`
}

const STORAGE_KEY = 'myArticles_v1';

// elements
const postsContainer = document.getElementById('postsContainer');
const submitPost = document.getElementById('submitPost');
const openNew = document.getElementById('openNew');
const refreshBtn = document.getElementById('refreshBtn');
const titleEl = document.getElementById('title');
const descEl = document.getElementById('desc');
const imageEl = document.getElementById('image');
const datetimeEl = document.getElementById('datetime');
const clearForm = document.getElementById('clearForm');
const createPanel = document.getElementById('createPanel');

const modal = document.getElementById('modal');
const editTitle = document.getElementById('editTitle');
const editImage = document.getElementById('editImage');
const editDesc = document.getElementById('editDesc');
const editDatetime = document.getElementById('editDatetime');
const saveEdit = document.getElementById('saveEdit');
const closeModal = document.getElementById('closeModal');

const loginModal = document.getElementById('loginModal');
const loginBtn = document.getElementById('loginBtn');
const loginUser = document.getElementById('loginUser');
const loginPass = document.getElementById('loginPass');
const doLogin = document.getElementById('doLogin');
const closeLogin = document.getElementById('closeLogin');
const logoutBtn = document.getElementById('logoutBtn');

const adminBadge = document.getElementById('adminBadge');

let editingId = null;










// ---------------------------
// Storage helpers
// ---------------------------
function loadPosts() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch { return [] }
}
function savePosts(posts) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
}

// admin state stored in sessionStorage (cleared on tab close) for demo
function isAdmin() {
    return sessionStorage.getItem('isAdmin') === '1';
}
function setAdmin(flag) {
    sessionStorage.setItem('isAdmin', flag ? '1' : '0');
    updateAdminUI();
}

function updateAdminUI() {
    const adminOnlyEls = document.querySelectorAll('.admin-only');
    if (isAdmin()) {
        adminOnlyEls.forEach(e => e.style.display = '');
        adminBadge.style.display = '';
        loginBtn.style.display = 'none';
    } else {
        adminOnlyEls.forEach(e => e.style.display = 'none');
        adminBadge.style.display = 'none';
        loginBtn.style.display = '';
        createPanel.style.display = 'none';
    }
    render(); // re-render so edit/delete buttons show/hide
}

// ---------------------------
// Rendering posts
// ---------------------------
function render() {
    const posts = loadPosts().slice().reverse();
    postsContainer.innerHTML = '';
    if (posts.length === 0) {
        postsContainer.innerHTML = '<div style="color:var(--muted)">No posts yet — admin can click New Post to create one.</div>'
    }
    posts.forEach(p => postsContainer.appendChild(renderPost(p)));
}

function renderPost(post) {
    const el = document.createElement('article');
    el.className = 'post';

    // top image
    const img = document.createElement('img');
    img.src = post.img || fallbackImageFor(post.title);
    img.alt = post.title || 'post image';

    const body = document.createElement('div');
    body.className = 'post-body';

    const h = document.createElement('h4');
    h.className = 'title';
    h.textContent = post.title || '(untitled)';

    const d = document.createElement('p');
    d.className = 'desc';
    d.textContent = post.desc || '';

    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.innerHTML = iconClock() + ` <span>${post.time}</span>`;

    const actions = document.createElement('div');
    actions.className = 'post-actions';

    // Like button (fans can like)
    const likeBtn = document.createElement('button');
    likeBtn.className = 'icon-btn';
    likeBtn.innerHTML = iconHeart() + ` <span class="count">${post.likes || 0}</span>`;
    if (getLiked(post.id)) likeBtn.classList.add('liked');
    likeBtn.addEventListener('click', () => {
        toggleLike(post.id);
        const posts = loadPosts(); const idx = posts.findIndex(x => x.id === post.id);
        if (idx >= 0) {
            posts[idx].likes = (posts[idx].likes || 0) + (getLiked(post.id) ? 1 : -1);
            savePosts(posts); render();
        }
    });

    // Comment toggle (fans can comment)
    const commentBtn = document.createElement('button');
    commentBtn.className = 'icon-btn';
    commentBtn.innerHTML = iconComment() + ` <span>${(post.comments || []).length}</span>`;

    // Edit button (admin only)
    const editBtn = document.createElement('button');
    editBtn.className = 'icon-btn admin-only';
    editBtn.innerHTML = iconEdit() + ' Edit';
    editBtn.addEventListener('click', () => openEdit(post.id));

    // Delete button (admin only)
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'icon-btn admin-only';
    deleteBtn.innerHTML = '🗑 Delete';
    deleteBtn.addEventListener('click', () => {
        if (!confirm('Delete this post?')) return;
        let posts = loadPosts();
        posts = posts.filter(x => x.id !== post.id);
        savePosts(posts);
        render();
    });

    actions.appendChild(likeBtn);
    actions.appendChild(commentBtn);
    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    // comments section
    const commentsWrap = document.createElement('div'); commentsWrap.className = 'comments';
    commentsWrap.style.display = 'none';
    (post.comments || []).forEach((c, cIdx) => {
        const cm = document.createElement('div'); cm.className = 'comment';
        cm.innerHTML = `<div class="avatar">${initials(c.name || 'A')}</div>
          <div style="flex:1">
            <div class="body"><div class="meta">${escapeHtml(c.name)} · ${c.time}</div><div>${escapeHtml(c.text)}</div></div>
          </div>`;
        // replies for this comment (admin replies)
        if (c.replies && c.replies.length) {
            c.replies.forEach(r => {
                const rp = document.createElement('div');
                rp.className = 'reply';
                rp.innerHTML = `<div class="meta">Admin · ${r.time}</div><div>${escapeHtml(r.text)}</div>`;
                cm.appendChild(rp);
            });
        }
        // show reply button for admin only
        if (isAdmin()) {
            const repBtn = document.createElement('button');
            repBtn.className = 'icon-btn';
            repBtn.style.marginLeft = '8px';
            repBtn.textContent = 'Reply as Admin';
            repBtn.addEventListener('click', () => {
                const txt = prompt('Reply to comment:');
                if (!txt) return;
                const posts = loadPosts(); const pIdx = posts.findIndex(x => x.id === post.id);
                if (pIdx >= 0) {
                    posts[pIdx].comments = posts[pIdx].comments || [];
                    posts[pIdx].comments[cIdx].replies = posts[pIdx].comments[cIdx].replies || [];
                    posts[pIdx].comments[cIdx].replies.push({ text: txt, time: nowText() });
                    savePosts(posts); render();
                }
            });
            cm.appendChild(repBtn);
        }
        commentsWrap.appendChild(cm);
    });

    // comment form (fans can post comments)
    const commentForm = document.createElement('div'); commentForm.style.marginTop = '8px'; commentForm.style.display = 'none';
    const inName = document.createElement('input'); inName.type = 'text'; inName.placeholder = 'Your name';
    inName.style.padding = '8px'; inName.style.borderRadius = '8px'; inName.style.marginRight = '6px'; inName.style.width = '30%';
    const inText = document.createElement('input'); inText.type = 'text'; inText.placeholder = 'Write a comment...';
    inText.style.padding = '8px'; inText.style.borderRadius = '8px'; inText.style.width = '50%';
    const btn = document.createElement('button'); btn.textContent = 'Post'; btn.className = 'btn'; btn.style.padding = '8px 12px';
    btn.addEventListener('click', () => {
        const name = inName.value.trim() || 'Fan';
        const text = inText.value.trim();
        if (!text) return;
        const posts = loadPosts(); const idx = posts.findIndex(x => x.id === post.id);
        if (idx >= 0) {
            posts[idx].comments = posts[idx].comments || [];
            posts[idx].comments.push({ name, text, time: nowText(), replies: [] });
            savePosts(posts); render();
        }
    });
    commentForm.appendChild(inName); commentForm.appendChild(inText); commentForm.appendChild(btn);

    commentBtn.addEventListener('click', () => {
        const show = commentsWrap.style.display === 'none';
        commentsWrap.style.display = show ? 'block' : 'none';
        commentForm.style.display = show ? 'flex' : 'none';
        commentForm.style.gap = '6px';
        commentBtn.animate([
            { transform: 'scale(1)', background: 'transparent' },
            { transform: 'scale(1.1)', background: 'rgba(124,92,255,0.15)' },
            { transform: 'scale(1)', background: 'transparent' }
        ], { duration: 400, easing: 'ease-in-out' });
    });

    body.appendChild(h); body.appendChild(d); body.appendChild(meta);
    el.appendChild(img); el.appendChild(body); el.appendChild(actions); el.appendChild(commentsWrap); el.appendChild(commentForm);
    return el;
}

function initials(n) { return escapeHtml(n[0]?.toUpperCase() || 'A'); }
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function fallbackImageFor(t) { return `https://placehold.co/600x400/111/eee?text=${encodeURIComponent((t || 'P')[0])}` }

function iconHeart() { return '<svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21s-6.7-4.6-10-9.3C-1 5 5 1 12 8c7-7 13-3 10 3.7-3.3 4.7-10 9.3-10 9.3z"/></svg>'; }
function iconComment() { return '<svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>'; }
function iconEdit() { return '<svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75l11-11.04-3.75-3.75L3 17.25zM20.7 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>'; }
function iconClock() { return '<svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M12 8v5h5m4 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/></svg>'; }

// likes stored per-browser (fans can only like once per browser)
function getLiked(id) { return localStorage.getItem('like_' + id) === '1'; }
function toggleLike(id) { const liked = getLiked(id); localStorage.setItem('like_' + id, liked ? '0' : '1'); }

// ---------------------------
// editing
// ---------------------------
function openEdit(id) {
    if (!isAdmin()) return alert('Only admin can edit posts.');
    const posts = loadPosts(); const p = posts.find(x => x.id === id);
    if (!p) return;
    editingId = id;
    editTitle.value = p.title; editImage.value = p.img; editDesc.value = p.desc; editDatetime.value = p.time;
    modal.classList.add('show');
}

closeModal.addEventListener('click', () => modal.classList.remove('show'));
saveEdit.addEventListener('click', () => {
    if (!editingId) return;
    const posts = loadPosts(); const idx = posts.findIndex(x => x.id === editingId);
    if (idx >= 0) {
        posts[idx].title = editTitle.value;
        posts[idx].img = editImage.value;
        posts[idx].desc = editDesc.value;
        posts[idx].time = editDatetime.value;
        savePosts(posts);
        render();
        modal.classList.remove('show');
    }
});

// ---------------------------
// create
// ---------------------------
openNew.addEventListener('click', () => {
    if (!isAdmin()) return alert('Only admin can create posts.');
    createPanel.style.display = createPanel.style.display === 'none' ? 'block' : 'none';
    datetimeEl.value = nowText();
});

clearForm.addEventListener('click', () => { titleEl.value = ''; descEl.value = ''; imageEl.value = ''; datetimeEl.value = nowText(); });

submitPost.addEventListener('click', () => {
    if (!isAdmin()) return alert('Only admin can publish posts.');
    const title = titleEl.value.trim(); const desc = descEl.value.trim(); const img = imageEl.value.trim(); const time = datetimeEl.value.trim() || nowText();
    if (!title) return alert('Please enter a title');
    const posts = loadPosts(); posts.push({ id: uid(), title, desc, img, time, likes: 0, comments: [] }); savePosts(posts);
    render(); clearForm.click(); createPanel.style.display = 'none';
});

refreshBtn.addEventListener('click', () => location.reload());

render();

// ---------------------------
// simple login modal logic
// ---------------------------
loginBtn.addEventListener('click', () => {
    loginModal.classList.add('show');
    loginUser.value = ADMIN_USERNAME;
    loginPass.value = '';
});
closeLogin.addEventListener('click', () => loginModal.classList.remove('show'));
doLogin.addEventListener('click', () => {
    const u = loginUser.value.trim();
    const p = loginPass.value;
    // very simple check (client-side)
    if (u === ADMIN_USERNAME && p === ADMIN_PASSWORD) {
        setAdmin(true);
        sessionStorage.setItem('adminName', u);
        alert('Logged in as admin');
        loginModal.classList.remove('show');
    } else {
        alert('Invalid credentials');
    }
});

logoutBtn.addEventListener('click', () => {
    setAdmin(false);
    sessionStorage.removeItem('adminName');
    alert('Logged out');
});

// init admin UI on load
(function initAdmin() {
    // If sessionStorage has admin flag already, keep it
    if (isAdmin()) updateAdminUI();
    else updateAdminUI();
})();

// ---------------------------
// initial sample data (only if no posts exist) — optional
// ---------------------------
(function seedIfEmpty() {
    const cur = loadPosts();
    if (!cur || cur.length === 0) {
        const sample = [
            { id: uid(), title: 'Welcome to BlogSphere', desc: 'This feed is admin-controlled. Fans can only read, like and comment.', img: '', time: nowText(), likes: 0, comments: [] }
        ];
        savePosts(sample);
        render();
    }
})();


//----------------------------------------//
// EDIT AND DELETE POST OPTION ONLY------//
//--------------------------------------//

function renderPost(post) {
    const el = document.createElement('article');
    el.className = 'post';

    // top image
    const img = document.createElement('img');
    img.src = post.img || fallbackImageFor(post.title);
    img.alt = post.title || 'post image';

    const body = document.createElement('div');
    body.className = 'post-body';

    const h = document.createElement('h4');
    h.className = 'title';
    h.textContent = post.title || '(untitled)';

    const d = document.createElement('p');
    d.className = 'desc';
    d.textContent = post.desc || '';

    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.innerHTML = iconClock() + ` <span>${post.time}</span>`;

    const actions = document.createElement('div');
    actions.className = 'post-actions';

    // Like button
    const likeBtn = document.createElement('button');
    likeBtn.className = 'icon-btn';
    likeBtn.innerHTML = iconHeart() + ` <span class="count">${post.likes || 0}</span>`;
    if (getLiked(post.id)) likeBtn.classList.add('liked');
    likeBtn.addEventListener('click', () => {
        toggleLike(post.id);
        const posts = loadPosts();
        const idx = posts.findIndex(x => x.id === post.id);
        if (idx >= 0) {
            posts[idx].likes = (posts[idx].likes || 0) + (getLiked(post.id) ? 1 : -1);
            savePosts(posts);
            render();
        }
    });
    actions.appendChild(likeBtn);

    // 👉 Admin-only buttons
    if (isAdmin()) {
        const editBtn = document.createElement('button');
        editBtn.className = 'btn';
        editBtn.textContent = '✏️ Edit Post';
        editBtn.addEventListener('click', () => openEdit(post.id));

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn';
        deleteBtn.textContent = '🗑 Delete Post';
        deleteBtn.addEventListener('click', () => {
            if (!confirm('Delete this post?')) return;
            let posts = loadPosts();
            posts = posts.filter(x => x.id !== post.id);
            savePosts(posts);
            render();
        });

        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);
    }

    body.appendChild(h);
    body.appendChild(d);
    body.appendChild(meta);

    el.appendChild(img);
    el.appendChild(body);
    el.appendChild(actions);

    return el;
}
