// 구글 트렌드 100 데이터를 로드하고 검색, 필터, 모달 및 뷰 모드를 제어하는 프론트엔드 스크립트
document.addEventListener('DOMContentLoaded', () => {
  let allTrends = [];
  const gridContainer = document.getElementById('grid-container');
  const searchInput = document.getElementById('search-input');
  const updateTimeElem = document.getElementById('update-time');
  const modalOverlay = document.getElementById('modal-overlay');
  const modalClose = document.getElementById('modal-close');
  const modalTitle = document.getElementById('modal-title');
  const modalTraffic = document.getElementById('modal-traffic');
  const modalSummary = document.getElementById('modal-summary');
  const modalNewsList = document.getElementById('modal-news-list');

  // Load trends.json
  fetch('data/trends.json')
    .then(res => res.json())
    .then(data => {
      allTrends = data.trends || [];
      
      const now = new Date();
      const dateStrShort = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;
      const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
      const dateStrFull = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 (${weekdays[now.getDay()]})`;

      const headerDateElem = document.getElementById('header-date');
      const heroDateElem = document.getElementById('hero-date');
      if (headerDateElem) headerDateElem.textContent = dateStrShort;
      if (heroDateElem) heroDateElem.textContent = dateStrFull;

      if (updateTimeElem && data.updated_at) {
        updateTimeElem.textContent = `최종 업데이트: ${data.updated_at} (KST)`;
      }
      renderTrends(allTrends);
    })
    .catch(err => {
      console.error('Failed to load trends data:', err);
      gridContainer.innerHTML = '<p style="color: #ef4444; text-align: center; grid-column: 1/-1;">데이터를 불러오는데 실패했습니다.</p>';
    });

  function renderTrends(trends) {
    gridContainer.innerHTML = '';
    if (trends.length === 0) {
      gridContainer.innerHTML = '<p style="color: var(--text-muted); text-align: center; grid-column: 1/-1; padding: 3rem;">검색 결과가 없습니다.</p>';
      return;
    }

    trends.forEach(item => {
      const card = document.createElement('div');
      card.className = 'trend-card';
      
      let rankClass = '';
      if (item.rank === 1) rankClass = 'rank-1';
      else if (item.rank === 2) rankClass = 'rank-2';
      else if (item.rank === 3) rankClass = 'rank-3';

      const newsCount = item.news ? item.news.length : 0;

      card.innerHTML = `
        <div>
          <div class="card-top">
            <div class="rank-badge ${rankClass}">${item.rank}</div>
            <div class="traffic-tag">🔥 ${item.traffic}</div>
          </div>
          <h3 class="keyword-title">${escapeHtml(item.title)}</h3>
          <p class="summary-preview">${escapeHtml(item.summary)}</p>
        </div>
        <div class="card-actions">
          <button class="btn-detail" data-rank="${item.rank}">이슈 요약 및 뉴스 ➔</button>
          <span class="news-count">관련 뉴스 ${newsCount}건</span>
        </div>
      `;

      card.querySelector('.btn-detail').addEventListener('click', () => {
        openModal(item);
      });

      gridContainer.appendChild(card);
    });
  }

  function openModal(item) {
    modalTitle.textContent = `${item.rank}위. ${item.title}`;
    modalTraffic.textContent = `검색량: ${item.traffic}`;
    modalSummary.innerHTML = escapeHtml(item.summary).replace(/\n/g, '<br>');

    modalNewsList.innerHTML = '';
    if (item.news && item.news.length > 0) {
      item.news.forEach(n => {
        const link = document.createElement('a');
        link.className = 'news-item-link';
        link.href = n.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.innerHTML = `
          <div class="news-title">${escapeHtml(n.title)}</div>
          <div class="news-snippet">${escapeHtml(n.snippet)}</div>
        `;
        modalNewsList.appendChild(link);
      });
    } else {
      modalNewsList.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem;">관련 뉴스가 없습니다.</p>';
    }

    modalOverlay.classList.add('active');
  }

  modalClose.addEventListener('click', () => {
    modalOverlay.classList.remove('active');
  });

  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      modalOverlay.classList.remove('active');
    }
  });

  // Search Filtering
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    const filtered = allTrends.filter(item => 
      item.title.toLowerCase().includes(query) || 
      item.summary.toLowerCase().includes(query)
    );
    renderTrends(filtered);
  });

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
});
