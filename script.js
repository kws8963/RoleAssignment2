/**
 * 우리 반 1인 1역할 배정 시스템 - script.js
 * 초등학교 학급을 위한 1:1 역할 무작위 매칭, 사운드, 폭죽, A4 인쇄 및 스프레드시트 연동
 */

(function () {
  'use strict';

  // ==========================================
  // 1. 기본 초기 데이터 (학생 12명, 역할 12개)
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
      desc: '수업 후 칠판을 깨끗이 닦고 분필과 지우개를 가지런히 정리해요.',
      color: 'mint'
    },
    {
      name: '우유 급식 도우미',
      icon: '🥛',
      desc: '매일 아침 우유 상자를 챙기고 급식 줄을 차례차례 세워요.',
      color: 'blue'
    },
    {
      name: '에너지 지킴이',
      icon: '💡',
      desc: '이동 수업이나 점심시간에 전등과 에어컨/선풍기를 확인하고 꺼요.',
      color: 'yellow'
    },
    {
      name: '도서관 사서',
      icon: '📚',
      desc: '학급 문고 책들을 번호순으로 바르게 꽂고 독서 통장을 도와줘요.',
      color: 'lavender'
    },
    {
      name: '식물 박사',
      icon: '🌿',
      desc: '교실 화분에 정성껏 물을 주고 싱그러운 초록 잎을 돌봐요.',
      color: 'mint'
    },
    {
      name: '줄서기 반장',
      icon: '🚶',
      desc: '특별실 이동이나 급식실 갈 때 바른 걸음으로 줄을 이끌어요.',
      color: 'orange'
    },
    {
      name: '방송 도우미',
      icon: '📺',
      desc: '아침 방송 조회와 수업용 스마트 TV, 빔프로젝터를 켜고 꺼요.',
      color: 'blue'
    },
    {
      name: '분리수거 대장',
      icon: '♻️',
      desc: '종이, 플라스틱, 캔이 제자리에 들어가도록 분리배출을 도와요.',
      color: 'pink'
    },
    {
      name: '건강 방역관',
      icon: '🧴',
      desc: '쉬는 시간 교실 환기를 책임지고 손소독제와 체온계를 바르게 관리해요.',
      color: 'yellow'
    },
    {
      name: '체육 부장',
      icon: '⚽',
      desc: '체육 시간 신나는 준비운동 구령을 붙이고 공과 줄넘기를 챙겨요.',
      color: 'orange'
    },
    {
      name: '학습지 정리왕',
      icon: '📑',
      desc: '선생님이 주시는 활동지와 알림장을 친구들에게 바르게 배부해요.',
      color: 'pink'
    },
    {
      name: '칭찬 우체부',
      icon: '💌',
      desc: '칭찬 상자에 모인 친구들의 따뜻한 칭찬 쪽지를 배달해 줘요.',
      color: 'lavender'
    }
  ];

  // 귀여운 아바타 이모지 모음
  const AVATARS = ['🧑‍🎓', '👧', '👦', '🧒', '🦊', '🐻', '🐰', '🐼', '🐥', '🦁', '🐨', '🐯'];

  // ==========================================
  // 2. 상태 관리 (State)
  // ==========================================
  let state = {
    className: '3학년 2반',
    students: [...DEFAULT_STUDENTS],
    roles: JSON.parse(JSON.stringify(DEFAULT_ROLES)),
    assignments: [], // [{ student, role, desc, icon, color, avatar }]
    isShuffling: false,
    soundEnabled: true,
    sheetUrl: '',
    swapSourceIndex: null
  };

  // 로컬스토리지 키
  const STORAGE_KEY = 'class_role_assigner_v1';

  // ==========================================
  // 3. Web Audio API 사운드 합성기 (외부 파일 없이 동작)
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
    // 주사위 롤링 틱 소리
    playTick() {
      if (!state.soundEnabled) return;
      this.init();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320 + Math.random() * 200, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.08);
    },
    // 배정 완료 팡파르 멜로디
    playFanfare() {
      if (!state.soundEnabled) return;
      this.init();
      if (!this.ctx) return;

      const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99]; // C4, E4, G4, C5, E5, G5
      const now = this.ctx.currentTime;

      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);

        gain.gain.setValueAtTime(0.12, now + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.4);
      });
    },
    // 스왑/버튼 클릭 소리
    playClick() {
      if (!state.soundEnabled) return;
      this.init();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.1);
    }
  };

  // ==========================================
  // 4. 화려한 콘페티 (폭죽 파티클 애니메이션)
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
      const colors = ['#ff7675', '#74b9ff', '#55efc4', '#ffeaa7', '#a29bfe', '#fd79a8'];
      const count = 90;

      for (let i = 0; i < count; i++) {
        this.particles.push({
          x: this.canvas.width * (0.3 + Math.random() * 0.4),
          y: this.canvas.height * 0.4,
          vx: (Math.random() - 0.5) * 16,
          vy: (Math.random() - 0.9) * 16,
          size: Math.random() * 8 + 6,
          color: colors[Math.floor(Math.random() * colors.length)],
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 10,
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
        p.vy += 0.35; // 중력
        p.vx *= 0.98;
        p.rotation += p.rotationSpeed;
        p.opacity -= 0.008;

        if (p.opacity <= 0 || p.y > this.canvas.height + 20) {
          this.particles.splice(i, 1);
          continue;
        }

        this.ctx.save();
        this.ctx.translate(p.x, p.y);
        this.ctx.rotate((p.rotation * Math.PI) / 180);
        this.ctx.fillStyle = p.color;
        this.ctx.globalAlpha = Math.max(0, p.opacity);
        this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
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
  // 5. 로컬스토리지 저장 및 복원
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
      console.warn('로컬스토리지 저장 실패:', e);
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
      console.warn('로컬스토리지 복원 실패:', e);
    }
  }

  // ==========================================
  // 6. UI 렌더링 함수들
  // ==========================================
  function updateHeaderSummary() {
    document.getElementById('studentCountBadge').textContent = `${state.students.length}명`;
    document.getElementById('roleCountBadge').textContent = `${state.roles.length}개`;
    document.getElementById('displayClassName').textContent = state.className;
    document.getElementById('printClassTitle').textContent = state.className;
    document.getElementById('printFooterClass').textContent = state.className;

    // 현재 날짜 갱신
    const now = new Date();
    const dateStr = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일`;
    document.getElementById('currentDateDisplay').textContent = dateStr;
    document.getElementById('printDateText').textContent = dateStr;

    // 배정 상태 표시
    const statusPill = document.getElementById('assignStatusPill');
    const statusText = document.getElementById('assignStatusText');
    if (state.assignments.length > 0) {
      statusPill.style.background = '#ecfdf5';
      statusPill.style.borderColor = '#a7f3d0';
      statusPill.style.color = '#065f46';
      statusText.textContent = '✨ 1인 1역할 배정 완료!';
    } else {
      statusPill.style.background = '#fdf2f8';
      statusPill.style.borderColor = '#fbcfe8';
      statusPill.style.color = '#9d174d';
      statusText.textContent = '배정 대기 중';
    }

    // 사운드 버튼 상태
    const soundBtn = document.getElementById('btnSoundToggle');
    if (state.soundEnabled) {
      soundBtn.innerHTML = '<span class="tool-icon">🔊</span><span class="tool-text">효과음 ON</span>';
      soundBtn.style.borderColor = '#cbd5e1';
    } else {
      soundBtn.innerHTML = '<span class="tool-icon">🔇</span><span class="tool-text">효과음 OFF</span>';
      soundBtn.style.borderColor = '#f87171';
    }
  }

  // 카드 그리드 렌더링
  function renderCards(isAnimating = false) {
    const grid = document.getElementById('cardsGrid');
    grid.innerHTML = '';

    // 배정 전 기본 상태: 순서대로 매핑 표시
    const items = state.assignments.length > 0 
      ? state.assignments 
      : state.students.map((student, i) => {
          const role = state.roles[i] || { name: '역할 준비 중', icon: '✨', desc: '역할을 준비 중입니다.', color: 'yellow' };
          return {
            student: student,
            avatar: AVATARS[i % AVATARS.length],
            role: role.name,
            icon: role.icon || '🌟',
            desc: role.desc || '함께 성실히 실천해요.',
            color: role.color || 'blue'
          };
        });

    items.forEach((item, idx) => {
      const card = document.createElement('div');
      card.className = `role-card ${isAnimating ? 'pop-in' : ''}`;
      card.setAttribute('data-color', item.color || 'pink');
      card.style.animationDelay = `${idx * 0.04}s`;

      card.innerHTML = `
        <div class="card-top">
          <div class="student-tag">
            <span class="student-avatar">${item.avatar}</span>
            <span class="student-name">${escapeHtml(item.student)}</span>
          </div>
          <span class="order-badge">#${idx + 1}</span>
        </div>
        <div class="card-body">
          <div class="role-header">
            <span class="role-icon">${item.icon}</span>
            <h4 class="role-title">${escapeHtml(item.role)}</h4>
          </div>
          <p class="role-desc">${escapeHtml(item.desc)}</p>
        </div>
        <div class="card-footer no-print">
          <button class="btn-card-swap" data-index="${idx}" title="다른 친구와 역할 바꾸기">
            🔀 역할 바꾸기
          </button>
        </div>
      `;

      // 카드 클릭 시 스왑 모달 열기
      card.querySelector('.btn-card-swap').addEventListener('click', (e) => {
        e.stopPropagation();
        openSwapModal(idx);
      });

      card.addEventListener('click', () => {
        openSwapModal(idx);
      });

      grid.appendChild(card);
    });

    // 인쇄용 테이블 동기화
    renderPrintTable(items);
  }

  // A4 인쇄용 테이블 렌더링
  function renderPrintTable(items) {
    const tbody = document.getElementById('printTableBody');
    tbody.innerHTML = '';

    items.forEach((item, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight: bold; color: #444;">${idx + 1}</td>
        <td class="name-cell">${escapeHtml(item.student)}</td>
        <td class="role-cell">${item.icon} ${escapeHtml(item.role)}</td>
        <td class="desc-cell">${escapeHtml(item.desc)}</td>
        <td style="color: #bbb; font-size: 8pt;">(확인)</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // ==========================================
  // 7. 역할 랜덤 배정 로직 (Fisher-Yates 셔플 & 룰렛 연출)
  // ==========================================
  function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function assignRolesWithRoulette() {
    if (state.isShuffling) return;

    // 학생 수와 역할 수 유효성 검사
    if (state.students.length === 0) {
      showToast('⚠️ 학생 명단이 비어 있습니다. [명단 편집]에서 추가해 주세요.', 'info');
      return;
    }
    if (state.roles.length === 0) {
      showToast('⚠️ 역할 목록이 비어 있습니다. [명단 편집]에서 역할을 추가해 주세요.', 'info');
      return;
    }

    state.isShuffling = true;
    SoundFX.init();

    const btnAssign = document.getElementById('btnAssign');
    btnAssign.disabled = true;
    btnAssign.style.opacity = '0.7';

    // 셔플 대상 준비
    const students = [...state.students];
    const roles = [...state.roles];

    // 역할 수가 학생 수보다 적으면 순환 확장, 많으면 학생 수만큼 슬라이스
    while (roles.length < students.length) {
      roles.push({
        name: `자율 도우미 ${roles.length + 1}`,
        icon: '🌟',
        desc: '친구들을 돕고 교실을 아름답게 가꿔요.',
        color: 'mint'
      });
    }

    // 셔플 애니메이션 시작
    const cards = document.querySelectorAll('.role-card');
    cards.forEach(c => c.classList.add('shuffling'));

    let tickCount = 0;
    const maxTicks = 16;
    const interval = setInterval(() => {
      tickCount++;
      SoundFX.playTick();

      // 임시로 무작위 카드 텍스트 깜빡임 효과
      cards.forEach(card => {
        const titleEl = card.querySelector('.role-title');
        const iconEl = card.querySelector('.role-icon');
        if (titleEl && iconEl) {
          const randomRole = roles[Math.floor(Math.random() * roles.length)];
          titleEl.textContent = randomRole.name;
          iconEl.textContent = randomRole.icon || '🎲';
        }
      });

      if (tickCount >= maxTicks) {
        clearInterval(interval);
        finalizeAssignment(students, roles);
      }
    }, 90);
  }

  function finalizeAssignment(students, roles) {
    // Fisher-Yates로 역할 무작위 셔플
    const shuffledRoles = shuffleArray(roles);

    // 1:1 매칭 생성
    state.assignments = students.map((student, idx) => {
      const assignedRole = shuffledRoles[idx % shuffledRoles.length];
      return {
        student: student,
        avatar: AVATARS[idx % AVATARS.length],
        role: assignedRole.name,
        icon: assignedRole.icon || '🌟',
        desc: assignedRole.desc || '성실하고 꼼꼼하게 실천해요.',
        color: assignedRole.color || 'blue'
      };
    });

    state.isShuffling = false;
    const btnAssign = document.getElementById('btnAssign');
    btnAssign.disabled = false;
    btnAssign.style.opacity = '1';

    // 화면 갱신
    renderCards(true);
    updateHeaderSummary();
    saveStateToStorage();

    // 팡파르 및 폭죽 파티클 발사
    SoundFX.playFanfare();
    Confetti.burst();
    showToast('🎉 1인 1역할 배정이 멋지게 완료되었습니다!', 'success');
  }

  // ==========================================
  // 8. 개별 스왑 (자리 바꾸기) 모달
  // ==========================================
  function openSwapModal(index) {
    if (state.isShuffling) return;
    const currentList = state.assignments.length > 0 
      ? state.assignments 
      : state.students.map((s, i) => ({
          student: s,
          role: state.roles[i]?.name || '역할',
          icon: state.roles[i]?.icon || '🌟'
        }));

    const currentStudent = currentList[index];
    if (!currentStudent) return;

    state.swapSourceIndex = index;

    document.getElementById('swapTargetDesc').innerHTML = `
      현재 <strong>[${escapeHtml(currentStudent.student)}]</strong> 친구의 역할: 
      <span style="color: #4f46e5; font-weight: 700;">${currentStudent.icon} ${escapeHtml(currentStudent.role)}</span><br>
      어느 친구와 역할을 맞바꿀까요?
    `;

    const select = document.getElementById('swapTargetSelect');
    select.innerHTML = '';

    currentList.forEach((item, idx) => {
      if (idx !== index) {
        const opt = document.createElement('option');
        opt.value = idx;
        opt.textContent = `${idx + 1}번 ${item.student} (${item.role})`;
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

    // 만약 배정 전 상태였다면 현재 화면 상태로 초기 배정 목록 고정
    if (state.assignments.length === 0) {
      state.assignments = state.students.map((student, i) => {
        const role = state.roles[i] || { name: '역할', icon: '🌟', desc: '', color: 'blue' };
        return {
          student,
          avatar: AVATARS[i % AVATARS.length],
          role: role.name,
          icon: role.icon || '🌟',
          desc: role.desc || '',
          color: role.color || 'blue'
        };
      });
    }

    // 학생의 역할을 서로 교환
    const sourceRole = state.assignments[sourceIdx].role;
    const sourceIcon = state.assignments[sourceIdx].icon;
    const sourceDesc = state.assignments[sourceIdx].desc;
    const sourceColor = state.assignments[sourceIdx].color;

    state.assignments[sourceIdx].role = state.assignments[targetIdx].role;
    state.assignments[sourceIdx].icon = state.assignments[targetIdx].icon;
    state.assignments[sourceIdx].desc = state.assignments[targetIdx].desc;
    state.assignments[sourceIdx].color = state.assignments[targetIdx].color;

    state.assignments[targetIdx].role = sourceRole;
    state.assignments[targetIdx].icon = sourceIcon;
    state.assignments[targetIdx].desc = sourceDesc;
    state.assignments[targetIdx].color = sourceColor;

    document.getElementById('swapModal').style.display = 'none';
    renderCards(false);
    saveStateToStorage();
    SoundFX.playClick();
    showToast(`🔄 ${state.assignments[sourceIdx].student} 친구와 ${state.assignments[targetIdx].student} 친구의 역할이 바뀌었어요!`, 'info');
  }

  // ==========================================
  // 9. 명단 및 역할 관리 모달
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

    // 역할 파싱
    const defaultIcons = ['🧹', '🥛', '💡', '📚', '🌿', '🚶', '📺', '♻️', '🧴', '⚽', '📑', '💌', '🌟', '✨', '🎨', '🔍'];
    const defaultColors = ['mint', 'blue', 'yellow', 'lavender', 'orange', 'pink'];

    state.roles = roleLines.map((line, idx) => {
      const parts = line.split('|');
      const name = parts[0].trim();
      const desc = parts[1] ? parts[1].trim() : '우리 반을 위해 성실히 실천해요.';
      return {
        name: name,
        icon: defaultIcons[idx % defaultIcons.length],
        desc: desc,
        color: defaultColors[idx % defaultColors.length]
      };
    });

    // 배정 상태 초기화 및 화면 반영
    state.assignments = [];
    saveStateToStorage();
    updateHeaderSummary();
    renderCards(false);

    document.getElementById('manageModal').style.display = 'none';
    showToast('💾 명단과 역할 목록이 성공적으로 업데이트되었습니다.', 'success');
  }

  // ==========================================
  // 10. 구글 스프레드시트 연동 및 내보내기 모달
  // ==========================================
  function openSheetModal() {
    document.getElementById('scriptUrlInput').value = state.sheetUrl || '';
    document.getElementById('sheetModal').style.display = 'flex';
  }

  // 스프레드시트용 TSV (탭 구분 텍스트) 클립보드 복사
  function copyTableToClipboard() {
    const items = state.assignments.length > 0 
      ? state.assignments 
      : state.students.map((s, i) => ({
          student: s,
          role: state.roles[i]?.name || '미배정',
          desc: state.roles[i]?.desc || ''
        }));

    let tsv = "번호\t학생 이름\t배정된 역할\t담당 임무\t학급명\t배정일자\n";
    const dateStr = new Date().toLocaleDateString('ko-KR');

    items.forEach((item, idx) => {
      tsv += `${idx + 1}\t${item.student}\t${item.role}\t${item.desc}\t${state.className}\t${dateStr}\n`;
    });

    navigator.clipboard.writeText(tsv).then(() => {
      showToast('📋 스프레드시트용 표가 클립보드에 복사되었습니다! 시트에서 Ctrl+V 하세요.', 'success');
    }).catch(err => {
      console.error(err);
      showToast('⚠️ 클립보드 복사에 실패했습니다.', 'info');
    });
  }

  // CSV 파일 다운로드
  function downloadCsv() {
    const items = state.assignments.length > 0 
      ? state.assignments 
      : state.students.map((s, i) => ({
          student: s,
          role: state.roles[i]?.name || '미배정',
          desc: state.roles[i]?.desc || ''
        }));

    let csvContent = "\uFEFF번호,학생이름,배정된역할,담당임무,학급,배정일자\n";
    const dateStr = new Date().toISOString().split('T')[0];

    items.forEach((item, idx) => {
      csvContent += `${idx + 1},"${item.student}","${item.role}","${item.desc.replace(/"/g, '""')}","${state.className}","${dateStr}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${state.className}_1인1역할_배정결과_${dateStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('📥 CSV 파일이 다운로드되었습니다.', 'success');
  }

  // Google Apps Script 실시간 연동 실행
  async function executeSheetSync() {
    const url = document.getElementById('scriptUrlInput').value.trim();
    if (!url) {
      showToast('💡 Google Apps Script Web App URL을 먼저 입력해주세요.', 'info');
      return;
    }

    state.sheetUrl = url;
    saveStateToStorage();

    showToast('🔄 스프레드시트와 데이터를 통신 중입니다...', 'info');

    try {
      // POST 통신으로 결과 전송
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
        mode: 'no-cors', // Apps Script CORS 우회
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      showToast('✅ 구글 스프레드시트에 결과 전송이 완료되었습니다!', 'success');
      document.getElementById('sheetModal').style.display = 'none';
    } catch (err) {
      console.warn('Apps Script 통신 오류:', err);
      showToast('⚠️ 시트 통신 중 확인이 필요합니다. 클립보드 복사를 이용할 수도 있어요.', 'info');
    }
  }

  // ==========================================
  // 11. 토스트 알림 함수
  // ==========================================
  function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${message}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px) scale(0.9)';
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 400);
    }, 3200);
  }

  // HTML 이스케이프 헬퍼
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
  // 12. 이벤트 리스너 바인딩 및 앱 초기화
  // ==========================================
  function initEvents() {
    // 🎲 역할 배정 버튼
    document.getElementById('btnAssign').addEventListener('click', () => {
      assignRolesWithRoulette();
    });

    // ↺ 초기화 버튼
    document.getElementById('btnReset').addEventListener('click', () => {
      if (confirm('현재 배정된 역할을 초기화하시겠습니까?')) {
        state.assignments = [];
        saveStateToStorage();
        updateHeaderSummary();
        renderCards(false);
        showToast('↺ 배정 상태가 초기화되었습니다.', 'info');
      }
    });

    // 🖨️ A4 인쇄하기 버튼
    document.getElementById('btnPrint').addEventListener('click', () => {
      SoundFX.playClick();
      // 인쇄 대화상자 호출 전 인쇄 테이블 최신 상태 확인
      renderPrintTable(state.assignments.length > 0 ? state.assignments : state.students.map((s, i) => ({
        student: s,
        avatar: AVATARS[i % AVATARS.length],
        role: state.roles[i]?.name || '역할',
        icon: state.roles[i]?.icon || '🌟',
        desc: state.roles[i]?.desc || ''
      })));
      window.print();
    });

    // 🔊 사운드 토글 버튼
    document.getElementById('btnSoundToggle').addEventListener('click', () => {
      state.soundEnabled = !state.soundEnabled;
      updateHeaderSummary();
      saveStateToStorage();
      if (state.soundEnabled) SoundFX.playTick();
    });

    // ✏️ 명단/역할 편집 모달 열기
    document.getElementById('btnManage').addEventListener('click', openManageModal);
    document.getElementById('btnCloseManageModal').addEventListener('click', () => {
      document.getElementById('manageModal').style.display = 'none';
    });
    document.getElementById('btnCancelManageModal').addEventListener('click', () => {
      document.getElementById('manageModal').style.display = 'none';
    });
    document.getElementById('btnSaveManageData').addEventListener('click', saveManageData);

    // 명단 편집 보조 버튼
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

    // 📊 스프레드시트 모달 열기
    document.getElementById('btnLoadSheet').addEventListener('click', () => {
      openSheetModal();
      showToast('🔄 스프레드시트 연동 창을 열었습니다.', 'info');
    });
    document.getElementById('btnSaveSheet').addEventListener('click', () => {
      openSheetModal();
    });
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

    // Apps Script 코드 복사
    document.getElementById('btnCopyGasCode').addEventListener('click', () => {
      const code = document.getElementById('gasCodeTemplate').textContent;
      navigator.clipboard.writeText(code).then(() => {
        showToast('📋 Apps Script 코드가 복사되었습니다!', 'success');
      });
    });

    // 🔀 스왑 모달 닫기 및 확인
    document.getElementById('btnCloseSwapModal').addEventListener('click', () => {
      document.getElementById('swapModal').style.display = 'none';
    });
    document.getElementById('btnCancelSwapModal').addEventListener('click', () => {
      document.getElementById('swapModal').style.display = 'none';
    });
    document.getElementById('btnConfirmSwap').addEventListener('click', handleConfirmSwap);

    // 모달 배경 클릭 시 닫기
    window.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-overlay')) {
        e.target.style.display = 'none';
      }
    });

    // 단축키: 스페이스바 누르면 역할 배정하기
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'INPUT') {
        const modalOpen = document.querySelector('.modal-overlay[style*="display: flex"]');
        if (!modalOpen) {
          e.preventDefault();
          assignRolesWithRoulette();
        }
      }
    });
  }

  // ==========================================
  // 13. 애플리케이션 시작
  // ==========================================
  function bootstrap() {
    loadStateFromStorage();
    Confetti.init();
    updateHeaderSummary();
    renderCards(false);
    initEvents();
  }

  // DOMContentLoaded 완료 후 실행
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }

})();
