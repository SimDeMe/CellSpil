// Stor "Del dig"-knap nederst på skærmen. Lyser op (grøn + puls), når den styrede celle er klar
// til at dele sig; ellers dæmpet og inaktiv. Klik (eller D-tasten) → 'divide'-intent.
import { divisionStatus } from '../core/systems/divisionSystem.js';

export function createDivideButton(btn /* HTMLButtonElement */, emitIntent) {
  btn.addEventListener('click', () => emitIntent && emitIntent({ type: 'divide' }));
  return {
    update(state) {
      const player = state.entities.find((e) => e.control && !e.dead);
      const st = divisionStatus(player);
      btn.disabled = !st.ready;
      btn.classList.toggle('ready', st.ready);

      // Vis hvad der mangler, så det aldrig er uklart, hvorfor man (ikke) kan dele sig.
      if (!player) btn.textContent = 'Del dig (D)';
      else if (st.ready) btn.textContent = '✦ Del dig (D)';
      else if (!st.hasResources) btn.textContent = 'Mangler byggesten';
      else btn.textContent = 'For lidt energi';
    },
  };
}
