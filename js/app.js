// 구글 트렌드 100 데이터 및 과거 날짜 히스토리를 로드하고 검색, 필터, 모달을 제어하는 프론트엔드 스크립트
document.addEventListener('DOMContentLoaded', () => {
  let allTrends = [];
  let availableDates = [];
  const gridContainer = document.getElementById('grid-container');
  const searchInput = document.getElementById('search-input');
  const updateTimeElem = document.getElementById('update-time');
  const selectYear = document.getElementById('select-year');
  const selectMonth = document.getElementById('select-month');
  const selectDay = document.getElementById('select-day');
  const headerDateElem = document.getElementById('header-date');
  const heroDateElem = document.getElementById('hero-date');

  const modalOverlay = document.getElementById('modal-overlay');
  const modalClose = document.getElementById('modal-close');
  const modalTitle = document.getElementById('modal-title');
  const modalTraffic = document.getElementById('modal-traffic');
  const modalSummary = document.getElementById('modal-summary');
  const modalNewsList = document.getElementById('modal-news-list');

  function populateDateSelectors(dates) {
    availableDates = dates;
    updateYearOptions();
  }

  function updateYearOptions() {
    const years = Array.from(new Set(availableDates.map(d => d.split('-')[0]))).sort().reverse();
    selectYear.innerHTML = '';
    years.forEach(y => {
      const opt = document.createElement('option');
      opt.value = y;
      opt.textContent = `${y}년`;
      selectYear.appendChild(opt);
    });

    if (years.length > 0) {
      selectYear.value = years[0];
      updateMonthOptions(years[0]);
    }
  }

  function updateMonthOptions(year) {
    const months = Array.from(new Set(
      availableDates
        .filter(d => d.startsWith(`${year}-`))
        .map(d => d.split('-')[1])
    )).sort().reverse();

    const currentMonthVal = selectMonth.value;
    selectMonth.innerHTML = '';
    months.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m;
      opt.textContent = `${parseInt(m, 10)}월`;
      selectMonth.appendChild(opt);
    });

    const targetMonth = months.includes(currentMonthVal) ? currentMonthVal : (months[0] || '');
    selectMonth.value = targetMonth;
    if (targetMonth) {
      updateDayOptions(year, targetMonth);
    }
  }

  function updateDayOptions(year, month) {
    const days = Array.from(new Set(
      availableDates
        .filter(d => d.startsWith(`${year}-${month}-`))
        .map(d => d.split('-')[2])
    )).sort().reverse();

    const currentDayVal = selectDay.value;
    selectDay.innerHTML = '';
    days.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d;
      opt.textContent = `${parseInt(d, 10)}일`;
      selectDay.appendChild(opt);
    });

    const targetDay = days.includes(currentDayVal) ? currentDayVal : (days[0] || '');
    selectDay.value = targetDay;
  }

  function getSelectedDateString() {
    const y = selectYear ? selectYear.value : '';
    const m = selectMonth ? selectMonth.value : '';
    const d = selectDay ? selectDay.value : '';
    if (y && m && d) {
      return `${y}-${m}-${d}`;
    }
    return null;
  }

  if (selectYear) {
    selectYear.addEventListener('change', () => {
      updateMonthOptions(selectYear.value);
      const selectedDate = getSelectedDateString();
      if (selectedDate) loadTrendData(selectedDate);
    });
  }

  if (selectMonth) {
    selectMonth.addEventListener('change', () => {
      updateDayOptions(selectYear.value, selectMonth.value);
      const selectedDate = getSelectedDateString();
      if (selectedDate) loadTrendData(selectedDate);
    });
  }

  if (selectDay) {
    selectDay.addEventListener('change', () => {
      const selectedDate = getSelectedDateString();
      if (selectedDate) loadTrendData(selectedDate);
    });
  }

  // 1. Immediately load latest trend data so page displays top 100 content on first load
  loadTrendData();

  // 2. Load available history dates and populate date dropdowns
  fetch(`data/history_dates.json?v=${Date.now()}`, { cache: 'no-store' })
    .then(res => res.json())
    .then(data => {
      let dates = data.dates || [];
      if (!dates.includes("2026-07-22")) dates.push("2026-07-22");
      if (!dates.includes("2026-07-23")) dates.unshift("2026-07-23");
      dates = Array.from(new Set(dates)).filter(Boolean).sort().reverse();

      populateDateSelectors(dates);
    })
    .catch(err => {
      console.warn('History dates index not found. Using fallback dates:', err);
      const fallbackDates = ["2026-08-02", "2026-08-01", "2026-07-31", "2026-07-23", "2026-07-22"];
      populateDateSelectors(fallbackDates);
    });

  function loadTrendData(targetDate) {
    const isLatest = !targetDate || targetDate === 'latest' || (availableDates.length > 0 && targetDate === availableDates[0]);
    let dataUrl = isLatest ? `data/trends.json?v=${Date.now()}` : `data/history/${targetDate}.json?v=${Date.now()}`;

    gridContainer.innerHTML = '<p style="color: var(--text-muted); text-align: center; grid-column: 1/-1; padding: 3rem;">데이터를 불러오는 중입니다...</p>';

    fetch(dataUrl, { cache: 'no-store' })
      .then(res => {
        if (!res.ok) {
          if (!isLatest) {
            console.warn(`History file ${dataUrl} not found, falling back to data/trends.json`);
            return fetch(`data/trends.json?v=${Date.now()}`, { cache: 'no-store' }).then(r => {
              if (!r.ok) throw new Error(`HTTP ${r.status}`);
              return r.json();
            });
          }
          throw new Error(`HTTP ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        allTrends = data.trends || [];
        
        // Update displayed dates
        const dateObj = data.date ? new Date(data.date) : new Date();
        const dateStrShort = `${dateObj.getFullYear()}.${String(dateObj.getMonth() + 1).padStart(2, '0')}.${String(dateObj.getDate()).padStart(2, '0')}`;
        const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
        const dateStrFull = `${dateObj.getFullYear()}년 ${dateObj.getMonth() + 1}월 ${dateObj.getDate()}일 (${weekdays[dateObj.getDay()]})`;

        if (headerDateElem) headerDateElem.textContent = dateStrShort;
        if (heroDateElem) heroDateElem.textContent = dateStrFull;

        if (updateTimeElem && data.updated_at) {
          updateTimeElem.textContent = `최종 수집: ${data.updated_at} (KST)`;
        }
        renderTrends(allTrends);
      })
      .catch(err => {
        console.error('Failed to load trends data:', err);
        gridContainer.innerHTML = '<p style="color: #ef4444; text-align: center; grid-column: 1/-1; padding: 3rem;">선택하신 날짜의 트렌드 데이터를 불러올 수 없습니다.</p>';
      });
  }

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
