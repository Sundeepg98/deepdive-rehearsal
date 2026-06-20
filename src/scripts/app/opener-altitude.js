/* ============ OPENER / ALTITUDE ============ */
/* The #open pane holds a set of ".op" opener cards. Each card carries a hidden
   answer (.op-a) and a "reveal" button (.op-rev); clicking reveal shows the
   answer and disables the button so it can't be toggled back. */
const openerCards = document.querySelectorAll('#open .op');
for (let i = 0; i < openerCards.length; i++) {
  (function (card) {
    const answer = card.querySelector('.op-a');
    const revealBtn = card.querySelector('.op-rev');
    revealBtn.onclick = function () {
      answer.classList.add('show');
      revealBtn.disabled = true;
      revealBtn.textContent = 'Revealed';
    };
  })(openerCards[i]);
}
