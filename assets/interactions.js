(() => {
  const tooltip = document.getElementById('notion-tooltip');
  let tooltipCard = null;
  let tooltipTouchId = null;
  let dismissed = false;

  function hideTooltip() {
    tooltip.hidden = true;
    tooltipCard?.removeAttribute('aria-describedby');
    tooltipCard = null;
    tooltipTouchId = null;
    tooltip.removeAttribute('data-pointer');
    if (tooltip.parentElement !== document.body) document.body.append(tooltip);
  }

  function showTooltip(card, pointerType) {
    if (tooltipCard !== card) tooltipCard?.removeAttribute('aria-describedby');
    tooltipCard = card;
    tooltip.textContent = card.dataset.tooltipText || 'Читать в\u00a0Notion';
    tooltip.dataset.pointer = pointerType;
    tooltip.hidden = false;
    card.setAttribute('aria-describedby', tooltip.id);
  }

  function moveTooltip(event, card) {
    if (event.pointerType === 'touch' || tooltipTouchId !== null || dismissed) return;
    if (tooltip.parentElement !== document.body) document.body.append(tooltip);
    showTooltip(card, event.pointerType);

    const gap = 16;
    const margin = 8;
    const width = tooltip.offsetWidth;
    const height = tooltip.offsetHeight;
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = document.documentElement.clientHeight;
    let left = event.clientX + gap;
    let top = event.clientY + gap;
    if (left + width > viewportWidth - margin) left = event.clientX - width - gap;
    if (top + height > viewportHeight - margin) top = event.clientY - height - gap;
    tooltip.style.left = `${Math.max(margin, Math.min(left, viewportWidth - width - margin))}px`;
    tooltip.style.top = `${Math.max(margin, Math.min(top, viewportHeight - height - margin))}px`;
  }

  document.querySelectorAll('[data-notion-tooltip], [data-tooltip-text]').forEach(card => {
    card.addEventListener('pointerenter', event => {
      dismissed = false;
      moveTooltip(event, card);
    });
    card.addEventListener('pointermove', event => moveTooltip(event, card));
    card.addEventListener('pointerleave', () => {
      if (tooltipTouchId === null) hideTooltip();
    });
    card.addEventListener('pointerdown', event => {
      if (event.pointerType !== 'touch') {
        hideTooltip();
        return;
      }
      if (!event.isPrimary || event.button !== 0) return;
      dismissed = false;
      tooltipTouchId = event.pointerId;
      // Keep the touch tooltip centered inside its card.
      tooltip.style.removeProperty('left');
      tooltip.style.removeProperty('top');
      card.append(tooltip);
      showTooltip(card, 'touch');
    });
    card.addEventListener('lostpointercapture', event => {
      if (event.pointerId === tooltipTouchId) hideTooltip();
    });
  });

  const endTooltipTouch = event => {
    if (event.pointerId === tooltipTouchId) hideTooltip();
  };
  window.addEventListener('pointerup', endTooltipTouch, true);
  window.addEventListener('pointercancel', endTooltipTouch, true);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      dismissed = true;
      hideTooltip();
    }
  });
  window.addEventListener('scroll', hideTooltip, true);
  window.addEventListener('resize', hideTooltip);
  window.addEventListener('blur', hideTooltip);

})();
