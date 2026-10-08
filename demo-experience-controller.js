// EN: The controller owns A-only presentation UI state; audio routing remains in spill-demo.html.
export function createDemoExperienceController({
  cabinNoiseButtons, playButton, muteButton,
  demoVolUpButton, demoVolDownButton, demoVolumeControl, demoVolumeSegments,
  labDemoVolUpButton, labDemoVolDownButton, labDemoVolumeControl, labDemoVolumeSegments,
  contentDemoVolUpButton, contentDemoVolDownButton, contentDemoVolumeSegments,
  feelnessControl, feelnessButtons, systemBoostButton,
  isPlaybackActive, onTogglePlayback, onStepDemoVolume, onStepAContentVolume, onToggleDemoMute,
  onSetFeelness, onBoostPointerDown, onBoostPointerUp, onBoostPointerCancel, onBoostClick,
  onEnsureBoostReleased, onCabinNoiseChange,
} = {}) {
  const speedButtons = Array.from(cabinNoiseButtons || []);
  let boostPointerActive = false;
  let suppressNextBoostClick = false;

  function render({
    cabinNoiseSpeed, monitorGainDb, aContentVolumeDb, demoDucked, demoPlaying, systemBoostHeld,
    systemBoostTimedUntil, protectionFeelness, boostAvailable, protectionReductionDb,
  } = {}) {
    if (Number.isFinite(cabinNoiseSpeed)) {
      speedButtons.forEach(button =>
        button.classList.toggle("active", Number(button.dataset.cabinSpeed) === cabinNoiseSpeed));
    }
    if (Number.isFinite(monitorGainDb)) {
      const activeCount = Math.max(1, Math.min(7, Math.round((monitorGainDb + 36) / 6) + 1));
      const limiterSteps = Number.isFinite(protectionReductionDb) && protectionReductionDb > .15
        ? Math.max(1, Math.ceil(protectionReductionDb / 6)) : 0;
      for (const segmentsElement of [demoVolumeSegments, contentDemoVolumeSegments]) {
        if (!segmentsElement) continue;
        const segments = Array.from(segmentsElement.children).filter(segment => segment.tagName === "SPAN");
        segments.forEach((segment, index) => {
          const active = index < activeCount;
          segment.classList.toggle("on", active);
          segment.classList.remove("boostStep");
          segment.classList.toggle("limiterStep", active && index >= activeCount - limiterSteps);
        });
      }
    }
    if (Number.isFinite(aContentVolumeDb)) {
      const activeCount = Math.max(1, Math.min(7, Math.round((aContentVolumeDb + 30) / 6) + 1));
      const limiterSteps = Number.isFinite(protectionReductionDb) && protectionReductionDb > .15
        ? Math.max(1, Math.ceil(protectionReductionDb / 6)) : 0;
      const segments = Array.from(labDemoVolumeSegments?.children || []).filter(segment => segment.tagName === "SPAN");
      segments.forEach((segment, index) => {
        const active = index < activeCount;
        segment.classList.toggle("on", active);
        segment.classList.remove("boostStep");
        segment.classList.toggle("limiterStep", active && index >= activeCount - limiterSteps);
      });
    }
    if (systemBoostHeld !== undefined) {
      for (const control of [demoVolumeControl]) control?.classList.remove("systemBoostActive");
      for (const button of [demoVolUpButton]) if (button) button.textContent = "DEMO +";
    }
    if (demoPlaying !== undefined && playButton) {
      const playing = Boolean(demoPlaying);
      playButton.textContent = playing ? "❚❚" : "▶";
      playButton.setAttribute("aria-label", playing ? "Pause Program A demo" : "Play Program A demo");
      playButton.setAttribute("aria-pressed", playing ? "true" : "false");
    }
    if (demoDucked !== undefined && muteButton) {
      const muted = Boolean(demoPlaying && demoDucked);
      muteButton.disabled = !demoPlaying;
      muteButton.classList.toggle("active", muted);
      if (muteButton.dataset.mutedState !== String(muted)) {
        muteButton.innerHTML = muted
          ? '<svg class="demoMutedIcon" viewBox="0 0 26 24" aria-hidden="true"><path d="M3 10h5l6-5v14l-6-5H3z"></path><path class="demoMuteCross" d="M18.5 8l5 5m0-5l-5 5"></path></svg><span>UNMUTE<br>DEMO</span>'
          : "MUTE FOR NARRATION";
        muteButton.dataset.mutedState = String(muted);
      }
      muteButton.setAttribute("aria-label", muted ? "Unmute demo" : "Mute demo for narration");
      muteButton.setAttribute("aria-pressed", muted ? "true" : "false");
    }
    Array.from(feelnessButtons || []).forEach(button => {
      button.disabled = false;
      button.classList.toggle("active", button.dataset.feelness === protectionFeelness);
    });
    const timedUntil = Number(systemBoostTimedUntil) || 0;
    if (systemBoostButton) {
      systemBoostButton.disabled = !boostAvailable && !systemBoostHeld;
      systemBoostButton.innerHTML = systemBoostHeld ? "TEST EFFECT ACTIVE<br>+6 dB · PROTECTION OFF" : "TEST EFFECT";
      systemBoostButton.classList.toggle("active", Boolean(systemBoostHeld));
      systemBoostButton.classList.toggle("timedBoost", timedUntil > 0);
    }
    feelnessControl?.classList.toggle("boostActive", Boolean(systemBoostHeld));
  }

  const selectSpeed = event => {
    const cabinNoiseSpeed = Number(event.currentTarget.dataset.cabinSpeed);
    onCabinNoiseChange?.(cabinNoiseSpeed);
    render({ cabinNoiseSpeed });
  };
  const togglePlayback = () => onTogglePlayback?.();
  const stepVolumeUp = () => onStepDemoVolume?.(6);
  const stepVolumeDown = () => onStepDemoVolume?.(-6);
  const stepAContentVolumeUp = () => onStepAContentVolume?.(6);
  const stepAContentVolumeDown = () => onStepAContentVolume?.(-6);
  const toggleMute = () => { if (isPlaybackActive?.()) onToggleDemoMute?.(); };
  const selectFeelness = event => onSetFeelness?.(event.currentTarget.dataset.feelness);
  const beginBoost = event => {
    if (systemBoostButton?.disabled) return;
    suppressNextBoostClick = false;
    boostPointerActive = true;
    onBoostPointerDown?.(event);
  };
  const endBoost = () => {
    if (!boostPointerActive) return false;
    boostPointerActive = false;
    const wasLongPress = Boolean(onBoostPointerUp?.());
    if (wasLongPress) suppressNextBoostClick = true;
    return wasLongPress;
  };
  const cancelBoost = () => {
    if (!boostPointerActive) return;
    boostPointerActive = false;
    suppressNextBoostClick = true;
    onBoostPointerCancel?.();
  };
  const handleBoostClick = event => {
    if (systemBoostButton?.disabled) return;
    if (suppressNextBoostClick && event.detail > 0) {
      suppressNextBoostClick = false;
      return;
    }
    suppressNextBoostClick = false;
    if (boostPointerActive) {
      const wasLongPress = endBoost();
      if (wasLongPress) {
        suppressNextBoostClick = false;
        return;
      }
    }
    onBoostClick?.();
  };
  const releaseBoostForVisibility = () => {
    boostPointerActive = false;
    suppressNextBoostClick = false;
    onEnsureBoostReleased?.();
  };
  const handleVisibilityChange = () => {
    if (document.hidden) releaseBoostForVisibility();
  };
  const suppressBoostContextMenu = event => event.preventDefault();

  speedButtons.forEach(button => button.addEventListener("click", selectSpeed));
  playButton?.addEventListener("click", togglePlayback);
  muteButton?.addEventListener("click", toggleMute);
  demoVolUpButton?.addEventListener("click", stepVolumeUp);
  demoVolDownButton?.addEventListener("click", stepVolumeDown);
  labDemoVolUpButton?.addEventListener("click", stepAContentVolumeUp);
  labDemoVolDownButton?.addEventListener("click", stepAContentVolumeDown);
  contentDemoVolUpButton?.addEventListener("click", stepVolumeUp);
  contentDemoVolDownButton?.addEventListener("click", stepVolumeDown);
  const demoFeelnessButtons = Array.from(feelnessButtons || []);
  demoFeelnessButtons.forEach(button => button.addEventListener("click", selectFeelness));
  systemBoostButton?.addEventListener("pointerdown", beginBoost);
  systemBoostButton?.addEventListener("pointerup", endBoost);
  systemBoostButton?.addEventListener("pointercancel", cancelBoost);
  systemBoostButton?.addEventListener("lostpointercapture", endBoost);
  systemBoostButton?.addEventListener("click", handleBoostClick);
  systemBoostButton?.addEventListener("contextmenu", suppressBoostContextMenu);
  window.addEventListener("blur", releaseBoostForVisibility);
  document.addEventListener("visibilitychange", handleVisibilityChange);

  return {
    render,
    dispose() {
      speedButtons.forEach(button => button.removeEventListener("click", selectSpeed));
      playButton?.removeEventListener("click", togglePlayback);
      muteButton?.removeEventListener("click", toggleMute);
      demoVolUpButton?.removeEventListener("click", stepVolumeUp);
      demoVolDownButton?.removeEventListener("click", stepVolumeDown);
      labDemoVolUpButton?.removeEventListener("click", stepAContentVolumeUp);
      labDemoVolDownButton?.removeEventListener("click", stepAContentVolumeDown);
      contentDemoVolUpButton?.removeEventListener("click", stepVolumeUp);
      contentDemoVolDownButton?.removeEventListener("click", stepVolumeDown);
      demoFeelnessButtons.forEach(button => button.removeEventListener("click", selectFeelness));
      systemBoostButton?.removeEventListener("pointerdown", beginBoost);
      systemBoostButton?.removeEventListener("pointerup", endBoost);
      systemBoostButton?.removeEventListener("pointercancel", cancelBoost);
      systemBoostButton?.removeEventListener("lostpointercapture", endBoost);
      systemBoostButton?.removeEventListener("click", handleBoostClick);
      systemBoostButton?.removeEventListener("contextmenu", suppressBoostContextMenu);
      window.removeEventListener("blur", releaseBoostForVisibility);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    },
  };
}
