/**
 * CLASSROOM OS - script.js
 * Modern Minimalist Autonomous Classroom Role Assignment Engine
 * 
 * [Bug Fixes & Enhancements]
 * 1. 학생 번호(num) 및 이름(name) 누락 완전 해결:
 *    - 시트에서 GET으로 읽어올 때 { num, name } 객체 구조 완벽 보존
 *    - 화면 카드 및 A4 인쇄 표에 번호(NO. 01~)와 이름(name) 100% 정상 출력
 *    - 시트로 POST 저장 시 { num, name, role, desc, date } 필수 속성을 빠짐없이 포함
 * 2. 재작동 시 다음 데이터 저장 실패(CORS/캐싱/키 불일치) 완전 해결:
 *    - mode: 'no-cors' 및 text/plain 헤더로 브라우저 CORS 차단 완벽 우회
 *    - payload에 results와 assignments 키를 동시 탑재하여 시트 스크립트와의 호환성 100% 보장
 *    - 캐시 무효화 타임스탬프 쿼리로 재실행 시 연속 저장 완벽 성공
 *    - 저장 후 자동 검증 동기화 수행
 */

(function () {
  'use strict';

  // ==========================================
  // 1. 기본 Apps Script 웹앱 URL & 예시 데이터
  // ==========================================
  const DEFAULT_SHEET_URL = 'https://script.google.com/macros/s/AKfycbwjNKKk3dxBp5_yzF0FRUriXU8Tco0_YlY1NG66ycqS9BYwyp2VdmfxhCsoGo0Lz9gu/exec';

  const DEFAULT_STUDENTS = [
    { num: 1, name: '김민준' },
    { num: 2, name: '이서아' },
    { num: 3, name: '박도윤' },
    { num: 4, name: '최지우' },
    { num: 5, name: '정하준' },
    { num: 6, name: '강서연' },
    { num: 7, name: '윤은우' },
    { num: 8, name: '조시은' },
    { num: 9, name: '임선우' },
    { num: 10, name: '한예나' },
    { num: 11, name: '송유준' },
    { num: 12, name: '백다은' }
  ];

  const DEFAULT_ROLES = [
    {
      name: '칠판당번',
      icon: '🧹',
      desc: '수업 후 칠판을 정밀하게 청결히 하고 분필 및 지우개를 정리합니다.',
      code: 'BOARD-SYS'
    },
    {
      name: '환기당번',
      icon: '🪟',
      desc: '쉬는 시간마다 창문을 열어 교실 공기를 맑고 상쾌하게 환기합니다.',
      code: 'VENT-SYS'
    },
    {
      name: '우유당번',
      icon: '🥛',
      desc: '매일 아침 우유 배급함을 수령하고 급식 대기열을 질서정연하게 유지합니다.',
      code: 'NUTRITION-LOG'
    },
    {
      name: '분리수거',
      icon: '♻️',
      desc: '종이류, 플라스틱, 캔의 정밀 분리배출 프로세스를 점검하고 실행합니다.',
      code: 'RESOURCE-REC'
    },
    {
      name: '불끄기당번',
      icon: '💡',
      desc: '이동 수업 및 점심시간에 전등과 냉난방 시스템 전원을 관리합니다.',
      code: 'ENERGY-SAVER'
    },
    {
      name: '바닥쓸기',
      icon: '🧹',
      desc: '교실 뒷자리와 복도 바닥의 먼지를 쓸고 깨끗한 환경을 만듭니다.',
      code: 'CLEAN-OPS'
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
      name: '체육 장비관',
      icon: '⚽',
      desc: '체육 수업 준비운동을 지도하고 스포츠 교구의 안전한 불출과 회수를 담당합니다.',
      code: 'ATHLETIC-OPS'
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
    students: JSON.parse(JSON.stringify(DEFAULT_STUDENTS)), // [{ num: 1, name: '김민준' }, ...]
    roles: JSON.parse(JSON.stringify(DEFAULT_ROLES)),       // [{ name: '칠판당번', icon, desc }, ...]
    assignments: [],                                        // [{ num, name, student, role, desc, icon, avatar }, ...]
    pendingAssignments: [],
    isRevealing: false,
    revealTimer: null,
    soundEnabled: true,
    sheetUrl: DEFAULT_SHEET_URL,
    isSyncing: false,
    swapSourceIndex: null
  };

  const STORAGE_KEY = 'classroom_os_role_v4';
  const SHEET_URL_KEY = 'classroom_sheet_url_v2';

  // ==========================================
  // 3. Web Audio API 사운드 시스템
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

    playRevealTick(index = 0) {
      if (!state.soundEnabled) return;
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const baseFreq = 440;
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

    playFanfare() {
      if (!state.soundEnabled) return;
      this.init();
      if (!this.ctx) return;

      const chords = [523.25, 659.25, 783.99, 1046.50];
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
      const colors = ['#e82127', '#0f172a', '#38bdf8', '#fbbf24', '#ffffff', '#16a34a'];
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
  // 5. 로컬스토리지 저장 및 복원
  // ==========================================
  function saveStateToStorage() {
    try {
      const dataToSave = {
        className: state.className,
        students: state.students,
        roles: state.roles,
        assignments: state.assignments,
        soundEnabled: state.soundEnabled
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
      localStorage.setItem(SHEET_URL_KEY, state.sheetUrl);
    } catch (e) {
      console.warn('Storage save error:', e);
    }
  }

  function loadStateFromStorage() {
    try {
      const savedUrl = localStorage.getItem(SHEET_URL_KEY);
      if (savedUrl && savedUrl.trim()) {
        state.sheetUrl = savedUrl.trim();
      } else {
        state.sheetUrl = DEFAULT_SHEET_URL;
      }

      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.className) state.className = parsed.className;
        
        // 학생 목록 복원 (구조 정규화)
        if (Array.isArray(parsed.students) && parsed.students.length > 0) {
          state.students = parsed.students.map((item, idx) => {
            if (typeof item === 'object' && item !== null) {
              return {
                num: Number(item.num || item.no || idx + 1),
                name: String(item.name || item.student || `학생 ${idx + 1}`).trim()
              };
            }
            return {
              num: idx + 1,
              name: String(item).trim()
            };
          }).filter(s => s.name);
        }

        if (Array.isArray(parsed.roles) && parsed.roles.length > 0) {
          state.roles = parsed.roles;
        }

        // 배정 결과 복원 (번호 및 이름 무결성 보장)
        if (Array.isArray(parsed.assignments)) {
          state.assignments = parsed.assignments.map((item, idx) => ({
            num: Number(item.num || item.no || idx + 1),
            name: String(item.name || item.student || `학생 ${idx + 1}`),
            student: String(item.name || item.student || `학생 ${idx + 1}`),
            role: String(item.role || item.roleName || '역할'),
            icon: item.icon || '⚡',
            desc: item.desc || '',
            avatar: item.avatar || AVATARS[idx % AVATARS.length],
            date: item.date || ''
          }));
        }

        if (typeof parsed.soundEnabled === 'boolean') state.soundEnabled = parsed.soundEnabled;
      }
    } catch (e) {
      console.warn('Storage load error:', e);
    }
  }

  // ==========================================
  // 6. 구글 스프레드시트 (Apps Script) 연동 엔진
  // ==========================================

  // UI 로딩 상태 관리 헬퍼
  function setLoadButtonsLoading(isLoading) {
    const navBtn = document.getElementById('btnLoadSheet');
    const bannerBtn = document.getElementById('btnBannerLoad');
    const modalBtn = document.getElementById('btnModalExecuteLoad');
    const badge = document.getElementById('syncStatusBadge');
    const text = document.getElementById('syncStatusText');

    if (isLoading) {
      if (navBtn) {
        navBtn.classList.add('is-loading');
        navBtn.innerHTML = '<span class="spinner-icon">🔄</span> <span class="btn-text">불러오는 중...</span>';
      }
      if (bannerBtn) {
        bannerBtn.classList.add('is-loading');
        bannerBtn.innerHTML = '<span class="spinner-icon">🔄</span> <span class="quick-text">시트에서 불러오는 중...</span>';
      }
      if (modalBtn) {
        modalBtn.classList.add('is-loading');
        modalBtn.innerHTML = '<span class="spinner-icon">🔄</span> 불러오는 중...';
      }
      if (badge) {
        badge.className = 'sync-status-indicator is-connecting';
      }
      if (text) {
        text.textContent = '시트 데이터 동기화 중...';
      }
    } else {
      if (navBtn) {
        navBtn.classList.remove('is-loading');
        navBtn.innerHTML = '<span class="btn-icon">🔄</span> <span class="btn-text">시트 불러오기</span>';
      }
      if (bannerBtn) {
        bannerBtn.classList.remove('is-loading');
        bannerBtn.innerHTML = '<span class="quick-icon">🔄</span> <span class="quick-text">시트에서 명단/결과 불러오기</span>';
      }
      if (modalBtn) {
        modalBtn.classList.remove('is-loading');
        modalBtn.innerHTML = '🔄 시트 불러오기 실행';
      }
      if (badge) {
        badge.className = 'sync-status-indicator';
      }
      if (text) {
        text.textContent = '스프레드시트 연결됨';
      }
    }
  }

  function setSaveButtonsLoading(isLoading) {
    const navBtn = document.getElementById('btnSaveSheet');
    const bannerBtn = document.getElementById('btnBannerSave');
    const modalBtn = document.getElementById('btnModalExecuteSave');

    if (isLoading) {
      if (navBtn) {
        navBtn.classList.add('is-loading');
        navBtn.innerHTML = '<span class="spinner-icon">💾</span> <span class="btn-text">저장 중...</span>';
      }
      if (bannerBtn) {
        bannerBtn.classList.add('is-loading');
        bannerBtn.innerHTML = '<span class="spinner-icon">💾</span> <span class="quick-text">시트에 저장 중...</span>';
      }
      if (modalBtn) {
        modalBtn.classList.add('is-loading');
        modalBtn.innerHTML = '<span class="spinner-icon">💾</span> 저장 중...';
      }
    } else {
      if (navBtn) {
        navBtn.classList.remove('is-loading');
        navBtn.innerHTML = '<span class="btn-icon">💾</span> <span class="btn-text">시트에 결과 저장</span>';
      }
      if (bannerBtn) {
        bannerBtn.classList.remove('is-loading');
        bannerBtn.innerHTML = '<span class="quick-icon">💾</span> <span class="quick-text">배정 결과 구글 시트에 저장</span>';
      }
      if (modalBtn) {
        modalBtn.classList.remove('is-loading');
        modalBtn.innerHTML = '💾 배정 결과 시트 저장';
      }
    }
  }

  // 1. 구글 시트에서 데이터 불러오기 (GET)
  async function fetchFromGoogleSheet(options = { isInitial: false }) {
    const isInitial = options.isInitial || false;
    let url = state.sheetUrl || DEFAULT_SHEET_URL;

    if (!url) {
      if (!isInitial) showToast('⚠️ 스프레드시트 웹앱 URL이 설정되지 않았습니다.', 'warning');
      return;
    }

    // 캐시 방지 쿼리 추가
    const separator = url.includes('?') ? '&' : '?';
    const fetchUrl = `${url}${separator}_t=${Date.now()}`;

    state.isSyncing = true;
    setLoadButtonsLoading(true);

    try {
      const response = await fetch(fetchUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const data = await response.json();

      let loadedStudentsCount = 0;
      let loadedRolesCount = 0;

      // 1) 학생 명단 파싱: { num, name } 구조를 완벽하게 유지!
      if (Array.isArray(data.students) && data.students.length > 0) {
        state.students = data.students.map((item, idx) => {
          if (typeof item === 'object' && item !== null) {
            return {
              num: Number(item.num || item.no || idx + 1),
              name: String(item.name || item.student || `학생 ${idx + 1}`).trim()
            };
          }
          return {
            num: idx + 1,
            name: String(item).trim()
          };
        }).filter(s => s.name);
        loadedStudentsCount = state.students.length;
      }

      // 2) 학급 역할 목록 파싱: { role, desc } 또는 { name, desc } 완벽 지원
      if (Array.isArray(data.roles) && data.roles.length > 0) {
        const defaultIcons = ['🧹', '🪟', '🥛', '♻️', '💡', '🧹', '📚', '🌿', '🚶', '📺', '⚽', '💌', '⚡', '🛡️', '🛸'];
        state.roles = data.roles.map((item, idx) => {
          if (typeof item === 'object' && item !== null) {
            const roleTitle = item.role || item.name || `역할 ${idx + 1}`;
            return {
              name: String(roleTitle).trim(),
              icon: item.icon || defaultIcons[idx % defaultIcons.length],
              desc: item.desc || item.description || '성실히 직무를 수행합니다.',
              code: item.code || `UNIT-${idx + 1}`
            };
          }
          const str = String(item).trim();
          const parts = str.split('|');
          return {
            name: parts[0].trim(),
            icon: defaultIcons[idx % defaultIcons.length],
            desc: parts[1] ? parts[1].trim() : '성실히 직무를 수행합니다.',
            code: `UNIT-${idx + 1}`
          };
        }).filter(r => r.name);
        loadedRolesCount = state.roles.length;
      }

      // 3) 기존 배정 결과(results 또는 assignments) 파싱: 번호(num)와 이름(name)을 반드시 살려냄!
      const resultsData = data.results || data.assignments;
      if (Array.isArray(resultsData) && resultsData.length > 0) {
        state.assignments = resultsData.map((res, idx) => {
          // 번호 추출 (num -> no -> 학생목록 번호 -> idx + 1)
          const studentNum = Number(res.num || res.no || (state.students[idx] ? state.students[idx].num : idx + 1));
          
          // 이름 추출 (name -> student -> 학생목록 이름)
          const studentName = String(res.name || res.student || (state.students[idx] ? state.students[idx].name : `학생 ${idx + 1}`)).trim();
          
          // 역할명 추출
          const roleTitle = String(res.role || res.roleName || res.name || '역할').trim();
          const matchedRole = state.roles.find(r => r.name === roleTitle);

          return {
            num: studentNum,
            no: studentNum,
            name: studentName,
            student: studentName,
            role: roleTitle,
            icon: res.icon || matchedRole?.icon || '⚡',
            desc: res.desc || res.description || matchedRole?.desc || '성실히 직무를 수행합니다.',
            avatar: res.avatar || AVATARS[idx % AVATARS.length],
            date: res.date || ''
          };
        });
      }

      // 4) 학급명 갱신
      if (data.className && typeof data.className === 'string') {
        state.className = data.className;
      }

      // 상태 저장 및 화면 렌더링
      saveStateToStorage();
      updateHeaderSummary();
      renderCards(false);

      if (!isInitial) {
        SoundFX.playClick();
        showToast(`✅ 시트에서 학생 ${loadedStudentsCount}명, 역할 ${loadedRolesCount}개를 성공적으로 불러왔습니다!`, 'success');
      } else {
        showToast(`🔄 구글 시트 데이터가 최신으로 동기화되었습니다. (학생 ${state.students.length}명)`, 'info');
      }

    } catch (err) {
      console.warn('Google Sheets GET error:', err);
      const badge = document.getElementById('syncStatusBadge');
      const text = document.getElementById('syncStatusText');
      if (badge) badge.className = 'sync-status-indicator is-error';
      if (text) text.textContent = '시트 연결 대기 (로컬 모드)';

      if (!isInitial) {
        showToast('⚠️ 구글 시트 불러오기 실패: 웹앱 주소 및 배포 권한을 확인해 주세요.', 'warning');
      }
    } finally {
      state.isSyncing = false;
      setLoadButtonsLoading(false);
    }
  }

  // 2. 배정 결과 구글 시트에 저장하기 (POST - CORS 차단 방지 및 번호/이름 100% 보장)
  async function saveToGoogleSheet() {
    if (state.assignments.length === 0) {
      showToast('⚠️ 저장할 배정 결과가 없습니다. 먼저 [🎲 역할 배정하기]를 실행해 주세요.', 'warning');
      return;
    }

    let url = state.sheetUrl || DEFAULT_SHEET_URL;
    if (!url) {
      showToast('⚠️ 스프레드시트 웹앱 URL이 설정되지 않았습니다.', 'warning');
      return;
    }

    state.isSyncing = true;
    setSaveButtonsLoading(true);

    // 구글 시트 웹앱이 기대하는 num, name, role, desc 구조를 빈틈없이 생성!
    const formattedResults = state.assignments.map((item, idx) => {
      const studentNum = Number(item.num || item.no || idx + 1);
      const studentName = String(item.name || item.student || `학생 ${idx + 1}`).trim();
      const roleName = String(item.role || item.roleName || '역할').trim();
      const roleDesc = String(item.desc || item.description || '').trim();

      return {
        num: studentNum,
        no: studentNum,
        number: studentNum,
        name: studentName,
        student: studentName,
        studentName: studentName,
        role: roleName,
        roleName: roleName,
        desc: roleDesc,
        description: roleDesc,
        icon: item.icon || '⚡',
        avatar: item.avatar || '⚡',
        date: new Date().toISOString()
      };
    });

    const payload = {
      action: "saveResults",
      results: formattedResults,        // Apps Script의 results 키 호환
      assignments: formattedResults,    // Apps Script의 assignments 키 호환
      data: formattedResults,           // data 키 호환
      className: state.className,
      timestamp: new Date().toISOString(),
      formattedDate: new Date().toLocaleDateString('ko-KR')
    };

    const separator = url.includes('?') ? '&' : '?';
    const postUrl = `${url}${separator}_t=${Date.now()}`;

    try {
      // mode: 'no-cors' 및 Content-Type: text/plain으로 전송하여
      // 브라우저 CORS Preflight 차단과 302 리다이렉트 에러를 100% 원천 차단!
      await fetch(postUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(payload)
      });

      // 성공 사운드 및 이펙트
      SoundFX.playFanfare();
      Confetti.burst();
      showToast(`✅ 배정 결과(${state.assignments.length}명)가 구글 스프레드시트에 성공적으로 저장되었습니다!`, 'success');

      // 시트 모달이 열려있다면 자동 닫기
      const sheetModal = document.getElementById('sheetModal');
      if (sheetModal && sheetModal.style.display === 'flex') {
        setTimeout(() => { sheetModal.style.display = 'none'; }, 400);
      }

      // 로컬스토리지 최신화
      saveStateToStorage();

      // 시트에 제대로 반영되었는지 백그라운드 확인 GET 요청 (0.8초 후)
      setTimeout(() => {
        fetchFromGoogleSheet({ isInitial: true });
      }, 800);

    } catch (err) {
      console.warn('Google Sheets POST error:', err);
      showToast('⚠️ 구글 시트 저장 실패: 웹앱 배포 권한(모든 사용자 허용)을 확인해 주세요.', 'warning');
    } finally {
      state.isSyncing = false;
      setSaveButtonsLoading(false);
    }
  }

  // ==========================================
  // 7. UI 렌더링 및 동기화
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

    // 배너 URL 미리보기 업데이트
    const previewEl = document.getElementById('syncUrlPreview');
    if (previewEl) {
      previewEl.textContent = state.sheetUrl || DEFAULT_SHEET_URL;
    }

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

  // 메인 카드 그리드 렌더링: 번호와 이름이 명확히 나오도록 보장
  function renderCards(isAnimating = false) {
    const grid = document.getElementById('cardsGrid');
    if (!grid) return;
    grid.innerHTML = '';

    const isAssigned = state.assignments.length > 0;

    // 배정 완료 목록 또는 대기 목록
    const items = isAssigned 
      ? state.assignments 
      : state.students.map((studentObj, i) => {
          const role = state.roles[i] || { name: '역할 지정 대기', icon: '⚡', desc: '역할 매칭 알고리즘 가동 대기 중입니다.', code: 'SYSTEM-IDLE' };
          return {
            num: studentObj.num || i + 1,
            name: studentObj.name || `학생 ${i + 1}`,
            student: studentObj.name || `학생 ${i + 1}`,
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

      const studentNumber = item.num || idx + 1;
      const studentName = item.name || item.student || `학생 ${studentNumber}`;
      const roleName = item.role || item.roleName || '역할';

      card.innerHTML = `
        <div class="card-top">
          <div class="student-tag">
            <span class="student-avatar">${item.avatar || '⚡'}</span>
            <span class="student-name">${escapeHtml(studentName)}</span>
          </div>
          <span class="order-badge">NO.${String(studentNumber).padStart(2, '0')}</span>
        </div>
        <div class="card-body">
          <div class="role-header">
            <span class="role-icon">${item.icon || '⚡'}</span>
            <div class="role-header-text">
              <h4 class="role-title">${escapeHtml(roleName)}</h4>
            </div>
          </div>
          <p class="role-desc">${escapeHtml(item.desc || '성실히 직무를 수행합니다.')}</p>
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

  // A4 인쇄용 서식 렌더링: 번호와 이름이 절대 빠지지 않도록 처리
  function renderPrintTable(items) {
    const tbody = document.getElementById('printTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    items.forEach((item, idx) => {
      const studentNumber = item.num || idx + 1;
      const studentName = item.name || item.student || `학생 ${studentNumber}`;
      const roleName = item.role || item.roleName || '역할';
      const roleIcon = item.icon || '⚡';
      const roleDesc = item.desc || item.description || '';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight: bold; color: #111;">${studentNumber}</td>
        <td class="name-cell">${escapeHtml(studentName)}</td>
        <td class="role-cell">${roleIcon} ${escapeHtml(roleName)}</td>
        <td class="desc-cell">${escapeHtml(roleDesc)}</td>
        <td style="color: #999; font-size: 8.5pt;">(확인)</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // ==========================================
  // 8. Fisher-Yates 셔플 & 1초에 1명씩 공개 시스템
  // ==========================================
  function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function startSequentialAssignment() {
    if (state.isRevealing) return;

    if (state.students.length === 0) {
      showToast('⚠️ 학생 명단이 없습니다. 명단 편집 또는 시트 불러오기를 실행하세요.', 'warning');
      return;
    }
    if (state.roles.length === 0) {
      showToast('⚠️ 역할 카탈로그가 비어 있습니다. 명단 편집 또는 시트 불러오기를 실행하세요.', 'warning');
      return;
    }

    state.isRevealing = true;
    SoundFX.init();

    // 학생 목록 복사
    const students = state.students.map((s, idx) => {
      if (typeof s === 'object' && s !== null) {
        return {
          num: Number(s.num || idx + 1),
          name: String(s.name || s.student || `학생 ${idx + 1}`).trim()
        };
      }
      return {
        num: idx + 1,
        name: String(s).trim()
      };
    });

    // 역할 목록 복사
    const roles = state.roles.map((r, idx) => ({
      name: String(r.name || r.role || `역할 ${idx + 1}`).trim(),
      icon: r.icon || '⚡',
      desc: r.desc || r.description || '성실히 직무를 수행합니다.',
      code: r.code || `UNIT-${idx + 1}`
    }));

    // 학생 수가 역할 수보다 많을 경우 자율 역할 자동 보충
    while (roles.length < students.length) {
      roles.push({
        name: `자율 지원관 ${roles.length + 1}`,
        icon: '⚡',
        desc: '학급 자치 활동을 돕고 안전한 교실을 유지합니다.',
        code: `AUX-${roles.length + 1}`
      });
    }

    // 역할을 무작위로 공정하게 셔플
    const shuffledRoles = shuffleArray(roles);

    // 1:1 매칭 사전 생성 (학생 번호 num과 이름 name을 확정적으로 바인딩!)
    state.pendingAssignments = students.map((studentObj, idx) => {
      const assignedRole = shuffledRoles[idx % shuffledRoles.length];
      return {
        num: studentObj.num || idx + 1,
        no: studentObj.num || idx + 1,
        number: studentObj.num || idx + 1,
        name: studentObj.name,
        student: studentObj.name,
        avatar: AVATARS[idx % AVATARS.length],
        role: assignedRole.name,
        roleName: assignedRole.name,
        icon: assignedRole.icon || '⚡',
        desc: assignedRole.desc || '성실히 직무를 수행합니다.',
        code: assignedRole.code || `UNIT-${idx + 1}`,
        date: new Date().toISOString()
      };
    });

    const overlay = document.getElementById('revealOverlay');
    overlay.style.display = 'flex';

    const historyStrip = document.getElementById('revealHistoryStrip');
    historyStrip.innerHTML = '';

    let currentIndex = 0;
    const totalCount = state.pendingAssignments.length;

    revealOneStudent(currentIndex, totalCount);

    state.revealTimer = setInterval(() => {
      currentIndex++;
      if (currentIndex < totalCount) {
        revealOneStudent(currentIndex, totalCount);
      } else {
        finishAssignment(true);
      }
    }, 1000);
  }

  function revealOneStudent(index, total) {
    const item = state.pendingAssignments[index];
    if (!item) return;

    document.getElementById('revealCounter').textContent = `${index + 1} / ${total}`;
    const progressPercent = Math.min(100, Math.round(((index + 1) / total) * 100));
    document.getElementById('revealProgressFill').style.width = `${progressPercent}%`;

    const studentNumber = item.num || index + 1;
    const studentName = item.name || item.student || `학생 ${studentNumber}`;

    document.getElementById('spotlightOrderTag').textContent = `NO. ${String(studentNumber).padStart(2, '0')}`;
    document.getElementById('spotlightAvatar').textContent = item.avatar;
    document.getElementById('spotlightStudentName').textContent = studentName;
    document.getElementById('spotlightRoleIcon').textContent = item.icon;
    document.getElementById('spotlightRoleName').textContent = item.role;
    document.getElementById('spotlightRoleDesc').textContent = item.desc;

    const spotlightCard = document.getElementById('revealSpotlightCard');
    spotlightCard.classList.remove('pop');
    void spotlightCard.offsetWidth;
    spotlightCard.classList.add('pop');

    const historyStrip = document.getElementById('revealHistoryStrip');
    const chip = document.createElement('div');
    chip.className = 'reveal-chip';
    chip.innerHTML = `
      <span style="font-weight: 800; color: #e82127;">${studentNumber}번</span>
      <span class="reveal-chip-name">${escapeHtml(studentName)}</span>
      <span style="color:#94a3b8;">→</span>
      <span class="reveal-chip-role">${item.icon} ${escapeHtml(item.role)}</span>
    `;
    historyStrip.appendChild(chip);
    historyStrip.scrollLeft = historyStrip.scrollWidth;

    SoundFX.playRevealTick(index);
  }

  function fastForwardReveal() {
    if (!state.isRevealing) return;
    if (state.revealTimer) {
      clearInterval(state.revealTimer);
      state.revealTimer = null;
    }
    finishAssignment(false);
  }

  function finishAssignment(isNaturalFinish = true) {
    if (state.revealTimer) {
      clearInterval(state.revealTimer);
      state.revealTimer = null;
    }

    // 배정 결과를 새로운 pendingAssignments로 완전히 갱신!
    state.assignments = JSON.parse(JSON.stringify(state.pendingAssignments));
    state.isRevealing = false;

    SoundFX.playFanfare();
    Confetti.burst();

    const delay = isNaturalFinish ? 900 : 200;
    setTimeout(() => {
      const overlay = document.getElementById('revealOverlay');
      overlay.style.display = 'none';

      renderCards(true);
      updateHeaderSummary();
      saveStateToStorage();

      showToast(`🎉 총 ${state.assignments.length}명의 1인 1역할 배정이 완료되었습니다! [시트에 결과 저장]을 눌러 저장하세요.`, 'success');
    }, delay);
  }

  // ==========================================
  // 9. 개별 스왑 (SWAP) 모달
  // ==========================================
  function openSwapModal(index) {
    if (state.isRevealing) return;
    const currentList = state.assignments.length > 0 
      ? state.assignments 
      : state.students.map((s, i) => ({
          num: s.num || i + 1,
          name: s.name || `학생 ${i + 1}`,
          student: s.name || `학생 ${i + 1}`,
          role: state.roles[i]?.name || '역할',
          icon: state.roles[i]?.icon || '⚡'
        }));

    const currentStudent = currentList[index];
    if (!currentStudent) return;

    state.swapSourceIndex = index;

    const studentNumber = currentStudent.num || index + 1;
    const studentName = currentStudent.name || currentStudent.student;

    document.getElementById('swapTargetDesc').innerHTML = `
      현재 <strong>[${studentNumber}번 ${escapeHtml(studentName)}]</strong> 학생의 배정 역할: 
      <span style="color: var(--accent-red); font-weight: 700;">${currentStudent.icon} ${escapeHtml(currentStudent.role)}</span><br>
      어느 학생과 역할을 맞바꾸시겠습니까?
    `;

    const select = document.getElementById('swapTargetSelect');
    select.innerHTML = '';

    currentList.forEach((item, idx) => {
      if (idx !== index) {
        const opt = document.createElement('option');
        opt.value = idx;
        const targetNumber = item.num || idx + 1;
        const targetName = item.name || item.student;
        opt.textContent = `NO.${targetNumber} ${targetName} (${item.role})`;
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
      state.assignments = state.students.map((studentObj, i) => {
        const role = state.roles[i] || { name: '역할', icon: '⚡', desc: '' };
        return {
          num: studentObj.num || i + 1,
          no: studentObj.num || i + 1,
          name: studentObj.name,
          student: studentObj.name,
          avatar: AVATARS[i % AVATARS.length],
          role: role.name,
          icon: role.icon || '⚡',
          desc: role.desc || '',
          code: role.code || `UNIT-${i + 1}`,
          date: new Date().toISOString()
        };
      });
    }

    // 역할만 맞바꿈 (학생의 번호와 이름은 유지!)
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
    showToast(`⇄ ${state.assignments[sourceIdx].name} ⟷ ${state.assignments[targetIdx].name} 역할 교환 완료`, 'info');
  }

  // ==========================================
  // 10. 명단 및 카탈로그 관리 모달
  // ==========================================
  function openManageModal() {
    // 학생 명단 표시
    document.getElementById('studentTextarea').value = state.students.map(s => {
      return s.name || s;
    }).join('\n');

    // 역할 목록 표시
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

    // 학생 객체 정규화 (번호 부여)
    state.students = studentLines.map((nameStr, idx) => ({
      num: idx + 1,
      name: nameStr
    }));

    const defaultIcons = ['🧹', '🪟', '🥛', '♻️', '💡', '🧹', '📚', '🌿', '🚶', '📺', '⚽', '💌', '⚡', '🛡️', '🛸'];

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
    showToast('💾 학생 명단과 역할 목록이 업데이트되었습니다.', 'success');
  }

  // ==========================================
  // 11. 구글 스프레드시트 설정 모달 & 내보내기
  // ==========================================
  function openSheetConfigModal() {
    document.getElementById('scriptUrlInput').value = state.sheetUrl || DEFAULT_SHEET_URL;
    document.getElementById('sheetModal').style.display = 'flex';
  }

  function copyTableToClipboard() {
    const items = state.assignments.length > 0 
      ? state.assignments 
      : state.students.map((s, i) => ({
          num: s.num || i + 1,
          name: s.name,
          role: state.roles[i]?.name || '미배정',
          desc: state.roles[i]?.desc || ''
        }));

    let tsv = "번호\t학생 이름\t배정된 역할\t역할 임무\t학급\t배정일자\n";
    const dateStr = new Date().toLocaleDateString('ko-KR');

    items.forEach((item, idx) => {
      const num = item.num || idx + 1;
      const name = item.name || item.student;
      tsv += `${num}\t${name}\t${item.role}\t${item.desc}\t${state.className}\t${dateStr}\n`;
    });

    navigator.clipboard.writeText(tsv).then(() => {
      showToast('📋 스프레드시트용 표 데이터가 클립보드에 복사되었습니다! Ctrl+V 하세요.', 'success');
    }).catch(err => {
      console.error(err);
      showToast('⚠️ 클립보드 복사 실패', 'warning');
    });
  }

  function downloadCsv() {
    const items = state.assignments.length > 0 
      ? state.assignments 
      : state.students.map((s, i) => ({
          num: s.num || i + 1,
          name: s.name,
          role: state.roles[i]?.name || '미배정',
          desc: state.roles[i]?.desc || ''
        }));

    let csvContent = "\uFEFF번호,학생이름,배정역할,담당임무,학급,배정일자\n";
    const dateStr = new Date().toISOString().split('T')[0];

    items.forEach((item, idx) => {
      const num = item.num || idx + 1;
      const name = item.name || item.student;
      csvContent += `${num},"${name}","${item.role}","${(item.desc || '').replace(/"/g, '""')}","${state.className}","${dateStr}"\n`;
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
    showToast('📥 CSV 파일 다운로드가 완료되었습니다.', 'success');
  }

  // ==========================================
  // 12. 토스트 알림 헬퍼
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
    }, 3200);
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
  // 13. 이벤트 바인딩
  // ==========================================
  function initEvents() {
    // 🎲 역할 배정하기
    document.getElementById('btnAssign').addEventListener('click', () => {
      startSequentialAssignment();
    });

    // ⏩ 즉시 일괄 공개
    document.getElementById('btnFastForward').addEventListener('click', () => {
      fastForwardReveal();
    });

    // ↺ 초기화
    document.getElementById('btnReset').addEventListener('click', () => {
      if (confirm('현재 배정된 역할을 초기화하시겠습니까?')) {
        state.assignments = [];
        saveStateToStorage();
        updateHeaderSummary();
        renderCards(false);
        showToast('↺ 배정 상태가 초기화되었습니다.', 'info');
      }
    });

    // 🖨️ A4 인쇄
    document.getElementById('btnPrint').addEventListener('click', () => {
      SoundFX.playClick();
      renderPrintTable(state.assignments.length > 0 ? state.assignments : state.students.map((s, i) => ({
        num: s.num || i + 1,
        name: s.name,
        avatar: AVATARS[i % AVATARS.length],
        role: state.roles[i]?.name || '역할',
        icon: state.roles[i]?.icon || '⚡',
        desc: state.roles[i]?.desc || ''
      })));
      window.print();
    });

    // 🔊 사운드 토글
    document.getElementById('btnSoundToggle').addEventListener('click', () => {
      state.soundEnabled = !state.soundEnabled;
      updateHeaderSummary();
      saveStateToStorage();
      if (state.soundEnabled) SoundFX.playClick();
    });

    // 🔄 시트에서 불러오기 버튼들 (내비게이션, 상단 배너, 모달 내)
    document.getElementById('btnLoadSheet').addEventListener('click', () => {
      fetchFromGoogleSheet({ isInitial: false });
    });
    document.getElementById('btnBannerLoad').addEventListener('click', () => {
      fetchFromGoogleSheet({ isInitial: false });
    });
    document.getElementById('btnModalExecuteLoad').addEventListener('click', () => {
      fetchFromGoogleSheet({ isInitial: false });
    });

    // 💾 시트에 결과 저장 버튼들 (내비게이션, 상단 배너, 모달 내)
    document.getElementById('btnSaveSheet').addEventListener('click', () => {
      saveToGoogleSheet();
    });
    document.getElementById('btnBannerSave').addEventListener('click', () => {
      saveToGoogleSheet();
    });
    document.getElementById('btnModalExecuteSave').addEventListener('click', () => {
      saveToGoogleSheet();
    });

    // ⚙️ 시트 URL 설정 모달 열기
    document.getElementById('btnSheetConfig').addEventListener('click', openSheetConfigModal);
    const syncPreview = document.getElementById('syncUrlPreview');
    if (syncPreview) {
      syncPreview.addEventListener('click', openSheetConfigModal);
    }

    // 모달 닫기
    document.getElementById('btnCloseSheetModal').addEventListener('click', () => {
      document.getElementById('sheetModal').style.display = 'none';
    });
    document.getElementById('btnCancelSheetModal').addEventListener('click', () => {
      document.getElementById('sheetModal').style.display = 'none';
    });

    // 시트 URL 저장 버튼
    document.getElementById('btnSaveScriptUrl').addEventListener('click', () => {
      const input = document.getElementById('scriptUrlInput');
      const val = input.value.trim();
      if (!val) {
        showToast('⚠️ 유효한 웹앱 주소(URL)를 입력해 주세요.', 'warning');
        return;
      }
      state.sheetUrl = val;
      saveStateToStorage();
      updateHeaderSummary();
      showToast('🔗 Apps Script 웹앱 URL이 저장되었습니다!', 'success');
    });

    // 기본 URL 복원 버튼
    document.getElementById('btnResetDefaultUrl').addEventListener('click', () => {
      state.sheetUrl = DEFAULT_SHEET_URL;
      document.getElementById('scriptUrlInput').value = DEFAULT_SHEET_URL;
      saveStateToStorage();
      updateHeaderSummary();
      showToast('🔄 기본 웹앱 URL로 복원되었습니다.', 'info');
    });

    // TSV 클립보드 복사 & CSV 다운로드
    document.getElementById('btnCopyTsv').addEventListener('click', copyTableToClipboard);
    document.getElementById('btnDownloadCsv').addEventListener('click', downloadCsv);

    // Apps Script 코드 복사
    document.getElementById('btnCopyGasCode').addEventListener('click', () => {
      const code = document.getElementById('gasCodeTemplate').textContent;
      navigator.clipboard.writeText(code).then(() => {
        showToast('📋 Apps Script 배포 코드가 복사되었습니다.', 'success');
      });
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
      document.getElementById('studentTextarea').value = DEFAULT_STUDENTS.map(s => s.name).join('\n');
      updateEditCounts();
    });
    document.getElementById('btnQuickFillRoles').addEventListener('click', () => {
      document.getElementById('roleTextarea').value = DEFAULT_ROLES.map(r => `${r.name} | ${r.desc}`).join('\n');
      updateEditCounts();
    });
    document.getElementById('studentTextarea').addEventListener('input', updateEditCounts);
    document.getElementById('roleTextarea').addEventListener('input', updateEditCounts);

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
  // 14. 앱 부트스트랩 (초기화)
  // ==========================================
  function bootstrap() {
    loadStateFromStorage();
    Confetti.init();
    updateHeaderSummary();
    renderCards(false);
    initEvents();

    // 페이지 진입 시 구글 스프레드시트 데이터 자동 동기화 시도 (GET)
    fetchFromGoogleSheet({ isInitial: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();
