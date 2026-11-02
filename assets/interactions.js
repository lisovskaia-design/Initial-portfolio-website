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
      // Keep the tooltip in the card's coordinate system while the card tilts.
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

  const tiltCards = document.querySelectorAll('#cardDS, #cardTable, #cardReword, #cardHSE');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const tiltSettings = {
    max: 15,
    startX: -3,
    startY: 0,
    perspective: 1000,
    speed: 500,
    scale: 1,
    glare: true,
    'max-glare': 0.2,
    reset: true,
    'reset-to-start': true,
    gyroscope: false
  };

  function syncTilt() {
    tiltCards.forEach(card => {
      if (reducedMotion.matches) {
        const tilt = card.vanillaTilt;
        if (tilt) {
          const glare = tilt.glareElementWrapper;
          tilt.destroy();
          glare.remove();
        }
        card.classList.remove('tilt-enabled');
      } else if (window.VanillaTilt && !card.vanillaTilt) {
        VanillaTilt.init(card, tiltSettings);
        // Use one Pointer Events driver; avoid compatibility mouse events after touch.
        card.vanillaTilt.removeEventListeners();
        card.classList.add('tilt-enabled');
      }
    });
  }

  syncTilt();
  reducedMotion.addEventListener('change', syncTilt);
  window.addEventListener('resize', () => {
    tiltCards.forEach(card => card.vanillaTilt?.onWindowResize());
  });

  tiltCards.forEach(card => {
    let gesture = null;
    let dragged = false;
    let suppressClickUntil = 0;

    function resetTilt() {
      const tilt = card.vanillaTilt;
      if (!tilt) return;
      if (tilt.updateCall !== null) cancelAnimationFrame(tilt.updateCall);
      tilt.updateCall = null;
      tilt.reset();
    }

    card.addEventListener('pointerenter', event => {
      if (event.pointerType !== 'touch') card.vanillaTilt?.onMouseEnter();
    });
    card.addEventListener('pointerleave', () => {
      if (!gesture) resetTilt();
    });

    card.addEventListener('pointerdown', event => {
      if (!event.isPrimary || event.button !== 0) return;
      dragged = false;
      suppressClickUntil = 0;
      gesture = event.pointerType === 'touch'
        ? { id: event.pointerId, x: event.clientX, y: event.clientY }
        : null;
      if (gesture && card.vanillaTilt) {
        card.setPointerCapture(event.pointerId);
        card.vanillaTilt.onMouseEnter();
      }
    });
    const trackGesture = event => {
      if (gesture?.id === event.pointerId &&
          Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 8) {
        dragged = true;
      }
    };
    card.addEventListener('pointermove', event => {
      if (event.pointerType !== 'touch') {
        if (!gesture) card.vanillaTilt?.onMouseMove(event);
      } else if (gesture?.id === event.pointerId) {
        trackGesture(event);
        if (dragged && card.vanillaTilt) {
          if (event.cancelable) event.preventDefault();
          card.vanillaTilt.onMouseMove(event);
        }
      }
    });
    card.addEventListener('pointerup', event => {
      if (gesture?.id !== event.pointerId) return;
      trackGesture(event);
      if (dragged) suppressClickUntil = Date.now() + 1500;
      gesture = null;
      if (card.hasPointerCapture(event.pointerId)) card.releasePointerCapture(event.pointerId);
      resetTilt();
    });
    const cancelGesture = event => {
      if (gesture?.id !== event.pointerId) return;
      dragged = true;
      suppressClickUntil = Date.now() + 1500;
      gesture = null;
      resetTilt();
    };
    card.addEventListener('pointercancel', cancelGesture);
    card.addEventListener('lostpointercapture', cancelGesture);
    card.addEventListener('contextmenu', event => {
      if (gesture && card.vanillaTilt) event.preventDefault();
    });
    card.addEventListener('click', event => {
      const keyboardClick = event.isTrusted && event.detail === 0 && event.pointerType !== 'touch';
      if (!keyboardClick && dragged && Date.now() < suppressClickUntil) {
        event.preventDefault();
        event.stopPropagation();
      }
    }, true);
  });
})();
