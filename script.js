/**
 * CLASSROOM OS - script.js
 * Modern Minimalist Autonomous Classroom Role Assignment Engine
 * Features:
 * - Fullscreen Backdrop Blur & 1-by-1 Sequential Role Reveal (1 sec interval)
 * - Fast-Forward (즉시 일괄 공개) Button
 * - Fisher-Yates Stochastic Matching Algorithm
 * - Web Audio API Harmonic Synthesis & Cyber Particles
 * - A4 Print Sheet Synchronization
 * - Google Apps Script / TSV / CSV Export
 */

(function () {
  'use strict';

  // ==========================================
  // 1. 기본 데이터 세트 (학생 12명, 학급 역할 12개)
  // ==========================================
  const DEFAULT_STUDENTS = [
    '김민준', '이서아', '박도윤', '최지우',
    '정하준', '강서연', '윤은우', '조시은',
    '임선우', '한예나', '송유준', '백다은'
  ];

  const DEFAULT_ROLES = [
    {
      name: '칠판 도우미',
      icon: '🧹',
      desc: '수업 후 칠판을 정밀하게 청결히 하고 분필 및 지우개를 정리합니다.',
      code: 'BOARD-SYS'
    },
    {
      name: '우유 급식 도우미',
      icon: '🥛',
      desc: '매일 아침 우유 배급함을 수령하고 급식 대기열을 질서정연하게 유지합니다.',
      code: 'NUTRITION-LOG'
    },
    {
      name: '에너지 지킴이',
      icon: '💡',
      desc: '이동 수업 및 점심시간에 전등과 냉난방 시스템 전원을 관리합니다.',
      code: 'ENERGY-SAVER'
    },
    {
      name: '도서관 사서',
      icon: '📚',
      desc: '학급 문고 도서 인벤토리를 번호순으로 분류하고 대출 목록을 점검합니다.',
      code: 'LIBRARY-DATA'
    },
    {
      name: '식물 관리자',
      icon: '🌿',
      desc: '교실 식물에 정기적인 수분을 공급하고 최적의 생육 환경을 점검합니다.',
      code: 'BIO-CARE'
    },
    {
      name: '대열 지도관',
      icon: '🚶',
      desc: '특별실 이동 및 강당 이동 시 신속하고 질서 있는 보행 대열을 인솔합니다.',
      code: 'FLEET-NAV'
    },
    {
      name: '스마트 방송관',
      icon: '📺',
      desc: '아침 방송 시청 및 수업용 디스플레이, 빔프로젝터 장비를 가동합니다.',
      code: 'MEDIA-OPS'
    },
    {
      name: '자원 리사이클러',
      icon: '♻️',
      desc: '종이류, 플라스틱, 캔의 정밀 분리배출 프로세스를 점검하고 실행합니다.',
      code: 'RESOURCE-REC'
    },
    {
      name: '환경 안전관',
      icon: '🧴',
      desc: '교실 내 공기 순환 환기를 주도하고 손소독제와 체온계를 상시 비치합니다.',
      code: 'SAFETY-CTRL'
    },
    {
      name: '체육 장비관',
      icon: '⚽',
      desc: '체육 수업 준비운동을 지도하고 스포츠 교구의 안전한 불출과 회수를 담당합니다.',
      code: 'ATHLETIC-OPS'
    },
    {
      name: '학습 자료관',
      icon: '📑',
      desc: '수업 활동지와 가정통신문을 친구들에게 신속 정확하게 배부합니다.',
      code: 'DOC-DISPATCH'
    },
    {
      name: '칭찬 커뮤니케이터',
      icon: '💌',
      desc: '친구들의 상호 칭찬 쪽지와 감사 메시지를 수집하여 따뜻하게 전달합니다.',
      code: 'PEER-REL'
    }
  ];

  const AVATARS = ['⚡', '💎', '🚀', '🌟', '🎯', '💡', '🛡️', '🛸', '🧭', '🔥', '⚙️', '✨'];

  // ==========================================
  // 2. 상태 관리 (State)
  // ==========================================
  let state = {
    className: '3학년 2반',
    students: [...DEFAULT_STUDENTS],
    roles: JSON.parse(JSON.stringify(DEFAULT_ROLES)),
    assignments: [],
    pendingAssignments: [],
    isRevealing: false,
    revealTimer: null,
    soundEnabled: true,
    sheetUrl: '',
    swapSourceIndex: null
  };

  const STORAGE_KEY = 'classroom_os_role_v3';

  // ==========================================
  // 3. Web Audio API 신스 사운드 시스템
  // ==========================================
  const SoundFX = {
    ctx: null,
    init() {
      if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    },

    // 1명씩 공개될 때마다 살짝 피치가 올라가는 경쾌한 사운드
    playRevealTick(index = 0) {
      if (!state.soundEnabled) return;
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const baseFreq = 440; // A4
      const scale = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19];
      const semitone = scale[index % scale.length];
      const freq = baseFreq * Math.pow(2, semitone / 12);

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    },

    // 최종 완료 팡파르 화음
    playFanfare() {
      if (!state.soundEnabled) return;
      this.init();
      if (!this.ctx) return;

      const chords = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      const now = this.ctx.currentTime;

      chords.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0.08, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.65);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.7);
      });
    },

    // 햅틱 UI 클릭음
    playClick() {
      if (!state.soundEnabled) return;
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(750, now);
      gain.gain.setValueAtTime(0.03, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
    }
  };

  // ==========================================
  // 4. 세련된 파티클 효과 (Confetti)
  // ==========================================
  const Confetti = {
    canvas: null,
    ctx: null,
    particles: [],
    animId: null,

    init() {
      this.canvas = document.getElementById('confettiCanvas');
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext('2d');
      this.resize();
      window.addEventListener('resize', () => this.resize());
    },

    resize() {
      if (!this.canvas) return;
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    },

    burst() {
      if (!this.canvas) return;
      this.resize();
      const colors = ['#e82127', '#0f172a', '#38bdf8', '#fbbf24', '#ffffff', '#e82127'];
      const count = 120;

      for (let i = 0; i < count; i++) {
        this.particles.push({
          x: this.canvas.width * (0.35 + Math.random() * 0.3),
          y: this.canvas.height * 0.35,
          vx: (Math.random() - 0.5) * 22,
          vy: (Math.random() - 0.85) * 20,
          w: Math.random() * 9 + 4,
          h: Math.random() * 5 + 3,
          color: colors[Math.floor(Math.random() * colors.length)],
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 14,
          opacity: 1
        });
      }

      if (!this.animId) {
        this.render();
      }
    },

    render() {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.45;
        p.vx *= 0.98;
        p.rotation += p.rotationSpeed;
        p.opacity -= 0.012;

        if (p.opacity <= 0 || p.y > this.canvas.height + 20) {
          this.particles.splice(i, 1);
          continue;
        }

        this.ctx.save();
        this.ctx.translate(p.x, p.y);
        this.ctx.rotate((p.rotation * Math.PI) / 180);
        this.ctx.fillStyle = p.color;
        this.ctx.globalAlpha = Math.max(0, p.opacity);
        this.ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        this.ctx.restore();
      }

      if (this.particles.length > 0) {
        this.animId = requestAnimationFrame(() => this.render());
      } else {
        this.animId = null;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
    }
  };

  // ==========================================
  // 5. 로컬스토리지 동기화
  // ==========================================
  function saveStateToStorage() {
    try {
      const dataToSave = {
        className: state.className,
        students: state.students,
        roles: state.roles,
        assignments: state.assignments,
        sheetUrl: state.sheetUrl,
        soundEnabled: state.soundEnabled
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (e) {
      console.warn('Storage save error:', e);
    }
  }

  function loadStateFromStorage() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.className) state.className = parsed.className;
        if (Array.isArray(parsed.students) && parsed.students.length > 0) state.students = parsed.students;
        if (Array.isArray(parsed.roles) && parsed.roles.length > 0) state.roles = parsed.roles;
        if (Array.isArray(parsed.assignments)) state.assignments = parsed.assignments;
        if (parsed.sheetUrl) state.sheetUrl = parsed.sheetUrl;
        if (typeof parsed.soundEnabled === 'boolean') state.soundEnabled = parsed.soundEnabled;
      }
    } catch (e) {
      console.warn('Storage load error:', e);
    }
  }

  // ==========================================
  // 6. UI 렌더링 및 동기화
  // ==========================================
  function updateHeaderSummary() {
    const studentCountEl = document.getElementById('studentCountBadge');
    const roleCountEl = document.getElementById('roleCountBadge');
    if (studentCountEl) studentCountEl.textContent = state.students.length;
    if (roleCountEl) roleCountEl.textContent = state.roles.length;

    const navGradeEl = document.getElementById('navGradeTitle');
    if (navGradeEl) navGradeEl.textContent = `${state.className} AUTONOMOUS FLEET`;

    const displayClassNameEl = document.getElementById('displayClassName');
    if (displayClassNameEl) displayClassNameEl.textContent = state.className;

    const printClassTitle = document.getElementById('printClassTitle');
    if (printClassTitle) printClassTitle.textContent = state.className;

    const printFooterClass = document.getElementById('printFooterClass');
    if (printFooterClass) printFooterClass.textContent = state.className;

    const now = new Date();
    const dateFormatted = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}`;
    const dateFull = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일`;

    const currentDateEl = document.getElementById('currentDateDisplay');
    if (currentDateEl) currentDateEl.textContent = dateFormatted;

    const printDateText = document.getElementById('printDateText');
    if (printDateText) printDateText.textContent = dateFull;

    const statusText = document.getElementById('assignStatusText');
    const statusSub = document.getElementById('assignStatusPill');
    if (state.assignments.length > 0) {
      if (statusText) {
        statusText.textContent = 'ACTIVE';
        statusText.style.color = '#16a34a';
      }
      if (statusSub) statusSub.textContent = '배정 완료 (100%)';
    } else {
      if (statusText) {
        statusText.textContent = 'READY';
        statusText.style.color = 'var(--accent-red)';
      }
      if (statusSub) statusSub.textContent = '배정 대기 중 (STANDBY)';
    }

    const soundBtn = document.getElementById('btnSoundToggle');
    if (soundBtn) {
      if (state.soundEnabled) {
        soundBtn.innerHTML = '<span class="btn-icon">🔊</span><span class="btn-text">SOUND ON</span>';
      } else {
        soundBtn.innerHTML = '<span class="btn-icon">🔇</span><span class="btn-text">MUTED</span>';
      }
    }
  }

  // 메인 카드 그리드 렌더링
  function renderCards(isAnimating = false) {
    const grid = document.getElementById('cardsGrid');
    if (!grid) return;
    grid.innerHTML = '';

    const items = state.assignments.length > 0 
      ? state.assignments 
      : state.students.map((student, i) => {
          const role = state.roles[i] || { name: '역할 지정 대기', icon: '⚡', desc: '역할 매칭 알고리즘 가동 대기 중입니다.', code: 'SYSTEM-IDLE' };
          return {
            student: student,
            avatar: AVATARS[i % AVATARS.length],
            role: role.name,
            icon: role.icon || '⚡',
            desc: role.desc || '성실히 직무를 수행합니다.',
            code: role.code || `UNIT-${i + 1}`
          };
        });

    items.forEach((item, idx) => {
      const card = document.createElement('div');
      card.className = `role-card ${isAnimating ? 'pop-in' : ''}`;
      card.style.animationDelay = `${idx * 0.03}s`;

      const isAssigned = state.assignments.length > 0;

      card.innerHTML = `
        <div class="card-top">
          <div class="student-tag">
            <span class="student-avatar">${item.avatar}</span>
            <span class="student-name">${escapeHtml(item.student)}</span>
          </div>
          <span class="order-badge">NO.${String(idx + 1).padStart(2, '0')}</span>
        </div>
        <div class="card-body">
          <div class="role-header">
            <span class="role-icon">${item.icon}</span>
            <div class="role-header-text">
              <h4 class="role-title">${escapeHtml(item.role)}</h4>
            </div>
          </div>
          <p class="role-desc">${escapeHtml(item.desc)}</p>
        </div>
        <div class="card-footer no-print">
          <span class="role-status-badge">${isAssigned ? '● ACTIVE' : '○ STANDBY'}</span>
          <button class="btn-card-swap" data-index="${idx}" title="역할 교환">
            SWAP ⇄
          </button>
        </div>
      `;

      card.querySelector('.btn-card-swap').addEventListener('click', (e) => {
        e.stopPropagation();
        openSwapModal(idx);
      });

      card.addEventListener('click', () => {
        openSwapModal(idx);
      });

      grid.appendChild(card);
    });

    renderPrintTable(items);
  }

  // A4 인쇄용 서식 렌더링
  function renderPrintTable(items) {
    const tbody = document.getElementById('printTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    items.forEach((item, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight: bold; color: #222;">${idx + 1}</td>
        <td class="name-cell">${escapeHtml(item.student)}</td>
        <td class="role-cell">${item.icon} ${escapeHtml(item.role)}</td>
        <td class="desc-cell">${escapeHtml(item.desc)}</td>
        <td style="color: #999; font-size: 8.5pt;">(확인)</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // ==========================================
  // 7. Fisher-Yates 셔플 & 1초에 1명씩 공개 시스템
  // ==========================================
  function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // 역할 배정 시작 (화면 흐려짐 및 순차 공개 오버레이 트리거)
  function startSequentialAssignment() {
    if (state.isRevealing) return;

    if (state.students.length === 0) {
      showToast('⚠️ 학생 명단이 없습니다. CONFIG에서 추가하세요.', 'info');
      return;
    }
    if (state.roles.length === 0) {
      showToast('⚠️ 역할 카탈로그가 비어 있습니다. CONFIG에서 추가하세요.', 'info');
      return;
    }

    state.isRevealing = true;
    SoundFX.init();

    // 셔플된 매칭 목록 사전 생성
    const students = [...state.students];
    const roles = [...state.roles];

    while (roles.length < students.length) {
      roles.push({
        name: `자율 지원관 ${roles.length + 1}`,
        icon: '⚡',
        desc: '학급 자치 활동을 돕고 안전한 교실을 유지합니다.',
        code: `AUX-${roles.length + 1}`
      });
    }

    const shuffledRoles = shuffleArray(roles);

    state.pendingAssignments = students.map((student, idx) => {
      const assignedRole = shuffledRoles[idx % shuffledRoles.length];
      return {
        student: student,
        avatar: AVATARS[idx % AVATARS.length],
        role: assignedRole.name,
        icon: assignedRole.icon || '⚡',
        desc: assignedRole.desc || '성실히 직무를 수행합니다.',
        code: assignedRole.code || `UNIT-${idx + 1}`
      };
    });

    // 화면 흐려짐 오버레이 활성화
    const overlay = document.getElementById('revealOverlay');
    overlay.style.display = 'flex';

    // 히스토리 스트립 초기화
    const historyStrip = document.getElementById('revealHistoryStrip');
    historyStrip.innerHTML = '';

    let currentIndex = 0;
    const totalCount = state.pendingAssignments.length;

    // 첫 번째 학생 즉시 공개
    revealOneStudent(currentIndex, totalCount);

    // 1초 간격으로 1명씩 공개
    state.revealTimer = setInterval(() => {
      currentIndex++;
      if (currentIndex < totalCount) {
        revealOneStudent(currentIndex, totalCount);
      } else {
        // 모든 인원 공개 완료
        finishAssignment(true);
      }
    }, 1000);
  }

  // 1명의 학생을 스포트라이트 카드에 노출
  function revealOneStudent(index, total) {
    const item = state.pendingAssignments[index];
    if (!item) return;

    // 카운터 및 진행률 갱신
    document.getElementById('revealCounter').textContent = `${index + 1} / ${total}`;
    const progressPercent = Math.min(100, Math.round(((index + 1) / total) * 100));
    document.getElementById('revealProgressFill').style.width = `${progressPercent}%`;

    // 스포트라이트 카드 데이터 바인딩
    document.getElementById('spotlightOrderTag').textContent = `NO. ${String(index + 1).padStart(2, '0')}`;
    document.getElementById('spotlightAvatar').textContent = item.avatar;
    document.getElementById('spotlightStudentName').textContent = item.student;
    document.getElementById('spotlightRoleIcon').textContent = item.icon;
    document.getElementById('spotlightRoleName').textContent = item.role;
    document.getElementById('spotlightRoleDesc').textContent = item.desc;

    // 카드 애니메이션 리플레이
    const spotlightCard = document.getElementById('revealSpotlightCard');
    spotlightCard.classList.remove('pop');
    void spotlightCard.offsetWidth; // trigger reflow
    spotlightCard.classList.add('pop');

    // 하단 히스토리 칩 추가
    const historyStrip = document.getElementById('revealHistoryStrip');
    const chip = document.createElement('div');
    chip.className = 'reveal-chip';
    chip.innerHTML = `
      <span>${item.avatar}</span>
      <span class="reveal-chip-name">${escapeHtml(item.student)}</span>
      <span style="color:#94a3b8;">→</span>
      <span class="reveal-chip-role">${item.icon} ${escapeHtml(item.role)}</span>
    `;
    historyStrip.appendChild(chip);
    historyStrip.scrollLeft = historyStrip.scrollWidth;

    // 사운드 재생
    SoundFX.playRevealTick(index);
  }

  // 즉시 일괄 공개 (Fast-forward) 버튼 처리
  function fastForwardReveal() {
    if (!state.isRevealing) return;
    clearInterval(state.revealTimer);
    finishAssignment(false);
  }

  // 최종 배정 확정 및 오버레이 닫기
  function finishAssignment(isNaturalFinish = true) {
    if (state.revealTimer) {
      clearInterval(state.revealTimer);
      state.revealTimer = null;
    }

    state.assignments = [...state.pendingAssignments];
    state.isRevealing = false;

    // 팡파르 및 축하 파티클
    SoundFX.playFanfare();
    Confetti.burst();

    // 약간의 딜레이 후 오버레이 닫고 메인 그리드 노출
    const delay = isNaturalFinish ? 900 : 250;
    setTimeout(() => {
      const overlay = document.getElementById('revealOverlay');
      overlay.style.display = 'none';

      renderCards(true);
      updateHeaderSummary();
      saveStateToStorage();

      showToast('🎉 모든 학생의 1인 1역할 배정이 완료되었습니다!', 'success');
    }, delay);
  }

  // ==========================================
  // 8. 개별 스왑 (SWAP) 모달
  // ==========================================
  function openSwapModal(index) {
    if (state.isRevealing) return;
    const currentList = state.assignments.length > 0 
      ? state.assignments 
      : state.students.map((s, i) => ({
          student: s,
          role: state.roles[i]?.name || '역할',
          icon: state.roles[i]?.icon || '⚡'
        }));

    const currentStudent = currentList[index];
    if (!currentStudent) return;

    state.swapSourceIndex = index;

    document.getElementById('swapTargetDesc').innerHTML = `
      현재 <strong>[${escapeHtml(currentStudent.student)}]</strong> 학생의 배정 역할: 
      <span style="color: var(--accent-red); font-weight: 700;">${currentStudent.icon} ${escapeHtml(currentStudent.role)}</span><br>
      어느 학생과 역할을 맞바꾸시겠습니까?
    `;

    const select = document.getElementById('swapTargetSelect');
    select.innerHTML = '';

    currentList.forEach((item, idx) => {
      if (idx !== index) {
        const opt = document.createElement('option');
        opt.value = idx;
        opt.textContent = `NO.${idx + 1} ${item.student} (${item.role})`;
        select.appendChild(opt);
      }
    });

    document.getElementById('swapModal').style.display = 'flex';
  }

  function handleConfirmSwap() {
    const targetIdx = parseInt(document.getElementById('swapTargetSelect').value, 10);
    const sourceIdx = state.swapSourceIndex;

    if (isNaN(targetIdx) || sourceIdx === null) {
      document.getElementById('swapModal').style.display = 'none';
      return;
    }

    if (state.assignments.length === 0) {
      state.assignments = state.students.map((student, i) => {
        const role = state.roles[i] || { name: '역할', icon: '⚡', desc: '' };
        return {
          student,
          avatar: AVATARS[i % AVATARS.length],
          role: role.name,
          icon: role.icon || '⚡',
          desc: role.desc || '',
          code: role.code || `UNIT-${i + 1}`
        };
      });
    }

    const sourceRole = state.assignments[sourceIdx].role;
    const sourceIcon = state.assignments[sourceIdx].icon;
    const sourceDesc = state.assignments[sourceIdx].desc;

    state.assignments[sourceIdx].role = state.assignments[targetIdx].role;
    state.assignments[sourceIdx].icon = state.assignments[targetIdx].icon;
    state.assignments[sourceIdx].desc = state.assignments[targetIdx].desc;

    state.assignments[targetIdx].role = sourceRole;
    state.assignments[targetIdx].icon = sourceIcon;
    state.assignments[targetIdx].desc = sourceDesc;

    document.getElementById('swapModal').style.display = 'none';
    renderCards(false);
    saveStateToStorage();
    SoundFX.playClick();
    showToast(`⇄ ${state.assignments[sourceIdx].student} ⟷ ${state.assignments[targetIdx].student} 역할 교환 완료`, 'info');
  }

  // ==========================================
  // 9. 명단 및 카탈로그 관리 모달
  // ==========================================
  function openManageModal() {
    document.getElementById('studentTextarea').value = state.students.join('\n');
    document.getElementById('roleTextarea').value = state.roles.map(r => `${r.name} | ${r.desc}`).join('\n');
    document.getElementById('inputClassName').value = state.className;
    updateEditCounts();
    document.getElementById('manageModal').style.display = 'flex';
  }

  function updateEditCounts() {
    const studentLines = document.getElementById('studentTextarea').value.trim().split('\n').filter(Boolean);
    const roleLines = document.getElementById('roleTextarea').value.trim().split('\n').filter(Boolean);
    document.getElementById('editStudentCount').textContent = studentLines.length;
    document.getElementById('editRoleCount').textContent = roleLines.length;
  }

  function saveManageData() {
    const studentLines = document.getElementById('studentTextarea').value.trim().split('\n').map(s => s.trim()).filter(Boolean);
    const roleLines = document.getElementById('roleTextarea').value.trim().split('\n').map(r => r.trim()).filter(Boolean);
    const classNameInput = document.getElementById('inputClassName').value.trim() || '3학년 2반';

    if (studentLines.length === 0) {
      alert('적어도 1명 이상의 학생 이름을 입력해 주세요.');
      return;
    }
    if (roleLines.length === 0) {
      alert('적어도 1개 이상의 역할을 입력해 주세요.');
      return;
    }

    state.className = classNameInput;
    state.students = studentLines;

    const defaultIcons = ['🧹', '🥛', '💡', '📚', '🌿', '🚶', '📺', '♻️', '🧴', '⚽', '📑', '💌', '⚡', '🛡️', '🛸'];

    state.roles = roleLines.map((line, idx) => {
      const parts = line.split('|');
      const name = parts[0].trim();
      const desc = parts[1] ? parts[1].trim() : '성실히 직무를 수행합니다.';
      return {
        name: name,
        icon: defaultIcons[idx % defaultIcons.length],
        desc: desc,
        code: `UNIT-${idx + 1}`
      };
    });

    state.assignments = [];
    saveStateToStorage();
    updateHeaderSummary();
    renderCards(false);

    document.getElementById('manageModal').style.display = 'none';
    showToast('CONFIG SAVED: 학생 명단과 역할 목록이 동기화되었습니다.', 'success');
  }

  // ==========================================
  // 10. 스프레드시트 모달 & Apps Script 연동
  // ==========================================
  function openSheetModal() {
    document.getElementById('scriptUrlInput').value = state.sheetUrl || '';
    document.getElementById('sheetModal').style.display = 'flex';
  }

  function copyTableToClipboard() {
    const items = state.assignments.length > 0 
      ? state.assignments 
      : state.students.map((s, i) => ({
          student: s,
          role: state.roles[i]?.name || '미배정',
          desc: state.roles[i]?.desc || ''
        }));

    let tsv = "번호\t학생 이름\t배정된 역할\t역할 임무\t학급\t배정일자\n";
    const dateStr = new Date().toLocaleDateString('ko-KR');

    items.forEach((item, idx) => {
      tsv += `${idx + 1}\t${item.student}\t${item.role}\t${item.desc}\t${state.className}\t${dateStr}\n`;
    });

    navigator.clipboard.writeText(tsv).then(() => {
      showToast('📋 CLIPBOARD COPIED: 스프레드시트에서 Ctrl+V 하세요.', 'success');
    }).catch(err => {
      console.error(err);
      showToast('⚠️ 클립보드 복사 실패', 'info');
    });
  }

  function downloadCsv() {
    const items = state.assignments.length > 0 
      ? state.assignments 
      : state.students.map((s, i) => ({
          student: s,
          role: state.roles[i]?.name || '미배정',
          desc: state.roles[i]?.desc || ''
        }));

    let csvContent = "\uFEFF번호,학생이름,배정역할,담당임무,학급,배정일자\n";
    const dateStr = new Date().toISOString().split('T')[0];

    items.forEach((item, idx) => {
      csvContent += `${idx + 1},"${item.student}","${item.role}","${item.desc.replace(/"/g, '""')}","${state.className}","${dateStr}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `CLASSROOM_OS_${state.className}_${dateStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('📥 CSV EXPORT COMPLETE: 다운로드가 완료되었습니다.', 'success');
  }

  async function executeSheetSync() {
    const url = document.getElementById('scriptUrlInput').value.trim();
    if (!url) {
      showToast('⚠️ Google Apps Script Web App URL을 입력하세요.', 'info');
      return;
    }

    state.sheetUrl = url;
    saveStateToStorage();

    showToast('🔄 SYNCING WITH GOOGLE SHEETS...', 'info');

    try {
      const payload = {
        className: state.className,
        date: new Date().toISOString(),
        assignments: state.assignments.length > 0 ? state.assignments : state.students.map((s, i) => ({
          student: s,
          role: state.roles[i]?.name || '미배정',
          desc: state.roles[i]?.desc || ''
        }))
      };

      await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      showToast('✅ SYNC COMPLETED: 스프레드시트에 저장되었습니다.', 'success');
      document.getElementById('sheetModal').style.display = 'none';
    } catch (err) {
      console.warn('Apps Script error:', err);
      showToast('⚠️ 시트 통신 오류 확인. 클립보드 복사를 권장합니다.', 'info');
    }
  }

  // ==========================================
  // 11. 토스트 알림 헬퍼
  // ==========================================
  function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${message}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px) scale(0.96)';
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, 3000);
  }

  function escapeHtml(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ==========================================
  // 12. 이벤트 바인딩
  // ==========================================
  function initEvents() {
    // [🎲 역할 배정하기] 버튼 클릭 -> 순차 공개 오버레이 시작
    document.getElementById('btnAssign').addEventListener('click', () => {
      startSequentialAssignment();
    });

    // ⏩ 즉시 일괄 공개 버튼
    document.getElementById('btnFastForward').addEventListener('click', () => {
      fastForwardReveal();
    });

    // 초기화 버튼
    document.getElementById('btnReset').addEventListener('click', () => {
      if (confirm('현재 배정된 역할을 초기화하시겠습니까?')) {
        state.assignments = [];
        saveStateToStorage();
        updateHeaderSummary();
        renderCards(false);
        showToast('↺ RESET COMPLETE: 배정 상태가 초기화되었습니다.', 'info');
      }
    });

    // A4 인쇄하기
    document.getElementById('btnPrint').addEventListener('click', () => {
      SoundFX.playClick();
      renderPrintTable(state.assignments.length > 0 ? state.assignments : state.students.map((s, i) => ({
        student: s,
        avatar: AVATARS[i % AVATARS.length],
        role: state.roles[i]?.name || '역할',
        icon: state.roles[i]?.icon || '⚡',
        desc: state.roles[i]?.desc || ''
      })));
      window.print();
    });

    // 사운드 토글
    document.getElementById('btnSoundToggle').addEventListener('click', () => {
      state.soundEnabled = !state.soundEnabled;
      updateHeaderSummary();
      saveStateToStorage();
      if (state.soundEnabled) SoundFX.playClick();
    });

    // 명단 편집 모달
    document.getElementById('btnManage').addEventListener('click', openManageModal);
    document.getElementById('btnCloseManageModal').addEventListener('click', () => {
      document.getElementById('manageModal').style.display = 'none';
    });
    document.getElementById('btnCancelManageModal').addEventListener('click', () => {
      document.getElementById('manageModal').style.display = 'none';
    });
    document.getElementById('btnSaveManageData').addEventListener('click', saveManageData);

    document.getElementById('btnQuickFillStudents').addEventListener('click', () => {
      document.getElementById('studentTextarea').value = DEFAULT_STUDENTS.join('\n');
      updateEditCounts();
    });
    document.getElementById('btnQuickFillRoles').addEventListener('click', () => {
      document.getElementById('roleTextarea').value = DEFAULT_ROLES.map(r => `${r.name} | ${r.desc}`).join('\n');
      updateEditCounts();
    });
    document.getElementById('studentTextarea').addEventListener('input', updateEditCounts);
    document.getElementById('roleTextarea').addEventListener('input', updateEditCounts);

    // 스프레드시트 모달
    document.getElementById('btnLoadSheet').addEventListener('click', openSheetModal);
    document.getElementById('btnSaveSheet').addEventListener('click', openSheetModal);
    document.getElementById('btnCloseSheetModal').addEventListener('click', () => {
      document.getElementById('sheetModal').style.display = 'none';
    });
    document.getElementById('btnCancelSheetModal').addEventListener('click', () => {
      document.getElementById('sheetModal').style.display = 'none';
    });
    document.getElementById('btnSaveScriptUrl').addEventListener('click', () => {
      const url = document.getElementById('scriptUrlInput').value.trim();
      state.sheetUrl = url;
      saveStateToStorage();
      showToast('🔗 Apps Script Web App URL이 저장되었습니다.', 'success');
    });
    document.getElementById('btnCopyTsv').addEventListener('click', copyTableToClipboard);
    document.getElementById('btnDownloadCsv').addEventListener('click', downloadCsv);
    document.getElementById('btnExecuteSheetSync').addEventListener('click', executeSheetSync);

    document.getElementById('btnCopyGasCode').addEventListener('click', () => {
      const code = document.getElementById('gasCodeTemplate').textContent;
      navigator.clipboard.writeText(code).then(() => {
        showToast('📋 Apps Script 코드가 복사되었습니다.', 'success');
      });
    });

    // 스왑 모달
    document.getElementById('btnCloseSwapModal').addEventListener('click', () => {
      document.getElementById('swapModal').style.display = 'none';
    });
    document.getElementById('btnCancelSwapModal').addEventListener('click', () => {
      document.getElementById('swapModal').style.display = 'none';
    });
    document.getElementById('btnConfirmSwap').addEventListener('click', handleConfirmSwap);

    window.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-overlay')) {
        e.target.style.display = 'none';
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'INPUT') {
        const modalOpen = document.querySelector('.modal-overlay[style*="display: flex"]');
        if (!modalOpen && !state.isRevealing) {
          e.preventDefault();
          startSequentialAssignment();
        }
      } else if (e.code === 'Escape' && state.isRevealing) {
        fastForwardReveal();
      }
    });
  }

  // ==========================================
  // 13. 초기화 실행
  // ==========================================
  function bootstrap() {
    loadStateFromStorage();
    Confetti.init();
    updateHeaderSummary();
    renderCards(false);
    initEvents();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();
