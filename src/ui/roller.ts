// 数字滚轮：每位一条 0–9(+0) 的竖向数字带，用弹簧曲线（CSS linear()）滚动，9→0 时向前多滚一格再无缝归位
export interface Roller { el: HTMLElement; set(v: number): void }

export function roller(digits: number, cls = ''): Roller {
  const el = document.createElement('span');
  el.className = `roller ${cls}`.trim();
  const cols: HTMLElement[] = [];
  let first = true;

  function addCol(): HTMLElement {
    const dg = document.createElement('span');
    dg.className = 'dg';
    const st = document.createElement('span');
    st.className = 'st';
    st.innerHTML = Array.from({ length: 11 }, (_, i) => `<span>${i % 10}</span>`).join('');
    st.addEventListener('transitionend', () => {
      if (st.dataset.wrap === '1') {
        st.dataset.wrap = '0';
        st.classList.add('snap');
        st.style.setProperty('--d', '0');
        void st.offsetWidth;
        st.classList.remove('snap');
      }
    });
    dg.appendChild(st);
    return dg;
  }
  for (let i = 0; i < digits; i++) { const c = addCol(); cols.push(c); el.appendChild(c); }
  el.setAttribute('aria-hidden', 'true');

  return {
    el,
    set(v: number) {
      const s = String(Math.max(0, Math.floor(v))).padStart(digits, '0');
      while (cols.length < s.length) { const c = addCol(); cols.unshift(c); el.prepend(c); }
      while (cols.length > s.length && cols.length > digits) { cols.shift()!.remove(); }
      [...s].forEach((ch, i) => {
        const st = cols[i].firstElementChild as HTMLElement;
        const d = Number(ch);
        const prev = st.dataset.d === undefined ? -1 : Number(st.dataset.d);
        if (prev === d) return;
        if (first) st.classList.add('snap');
        if (prev === 9 && d === 0 && !first) { st.dataset.wrap = '1'; st.style.setProperty('--d', '10'); }
        else st.style.setProperty('--d', String(d));
        st.dataset.d = String(d);
        if (first) { void st.offsetWidth; st.classList.remove('snap'); }
      });
      first = false;
    },
  };
}
