/* localStorage wrapper with in-memory fallback (keys are prefixed "nexus:") */
export const mem = {};
export const store = {
  get(k, d) { try { const v = localStorage.getItem('nexus:' + k); if (v != null) return JSON.parse(v); } catch (e) { /* storage unavailable */ } return k in mem ? mem[k] : d; },
  set(k, v) { mem[k] = v; try { localStorage.setItem('nexus:' + k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
  del(k) { delete mem[k]; try { localStorage.removeItem('nexus:' + k); } catch (e) { /* storage unavailable */ } }
};

/* Same pattern for sessionStorage: used when "Remember me" is off, so the session ends with the tab. */
const smem = {};
export const sessionStore = {
  get(k, d) { try { const v = sessionStorage.getItem('nexus:' + k); if (v != null) return JSON.parse(v); } catch (e) { /* storage unavailable */ } return k in smem ? smem[k] : d; },
  set(k, v) { smem[k] = v; try { sessionStorage.setItem('nexus:' + k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
  del(k) { delete smem[k]; try { sessionStorage.removeItem('nexus:' + k); } catch (e) { /* storage unavailable */ } }
};
