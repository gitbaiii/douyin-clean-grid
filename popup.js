"use strict";
const defaults = { enabled: true, blockHover: true };
const keys = ["enabled", "blockHover"];
chrome.storage.local.get(defaults, (settings) => {
  if (chrome.runtime.lastError) {
    console.error("读取设置失败。");
    return;
  }
  for (const key of keys) {
    const toggle = document.getElementById(key);
    toggle.checked = settings[key] !== false;
    toggle.disabled = false;
  }
});
for (const key of keys) {
  const toggle = document.getElementById(key);
  toggle.addEventListener("change", () => {
    toggle.disabled = true;
    chrome.storage.local.set({ [key]: toggle.checked }, () => {
      if (chrome.runtime.lastError) {
        toggle.checked = !toggle.checked;
        console.error("保存设置失败。");
      }
      toggle.disabled = false;
    });
  });
}

const resetButton = document.getElementById("reset-settings");

resetButton.addEventListener("click", () => {
  chrome.storage.local.set(defaults, () => {
    if (chrome.runtime.lastError) {
      console.error("恢复默认设置失败。");
      return;
    }

    for (const key of keys) {
      document.getElementById(key).checked = defaults[key];
    }
  });
});
