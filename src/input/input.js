// input/ — oversætter mus/taster til INTENTS (ikke direkte celle-mutation). Se ARCHITECTURE.md §9.
// Intent-typer: 'move-to', 'divide', 'use-ability', 'set-policy', 'rally', 'take-over-cell',
//               'buy-mutation', 'set-lens'.
export function createInput(target /* window/element */) {
  const queue = [];
  const emit = (intent) => queue.push(intent);

  // Musen → 'move-to'-intent (spilleren svømmer derhen; movementSystem læser den).
  // NB: bruger skærm-koordinater = verden-koordinater indtil rendereren får et rigtigt kamera.
  //     Når kameraet kommer, skal (clientX,clientY) regnes om til verden via camera.x/zoom.
  if (target?.addEventListener) {
    target.addEventListener('mousemove', (ev) => {
      emit({ type: 'move-to', x: ev.clientX, y: ev.clientY });
    });
  }

  // TODO: flere event-listeners (keydown D→divide, E/R→use-ability ...).

  return {
    emit,
    /** Tøm køen ind i state.intents i starten af en tick. */
    drainInto(state) {
      for (const i of queue) state.intents.push(i);
      queue.length = 0;
    },
  };
}
