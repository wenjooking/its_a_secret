/* Shared 8-digit passcode display + numpad (settings, etc.) */
(function () {
  const PASSCODE_LENGTH = 8;

  function isTextInputFocused() {
    const el = document.activeElement;
    if (!el) return false;
    const tag = el.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
  }

  function attachKeyboard({ isEnabled, onDigit, onBackspace, onClear }) {
    function handleKeydown(e) {
      if (!isEnabled()) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (isTextInputFocused()) return;

      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        onDigit(e.key);
        return;
      }
      if (e.key === "Backspace") {
        e.preventDefault();
        onBackspace();
        return;
      }
      if (e.key === "Delete") {
        e.preventDefault();
        onClear();
      }
    }

    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }

  function renderField(field, isActive) {
    if (!field.valueEl) return;
    field.valueEl.replaceChildren();

    for (let i = 0; i < PASSCODE_LENGTH; i++) {
      const char = document.createElement("span");
      char.className =
        i < field.digits.length
          ? "passcode-char passcode-char--filled"
          : "passcode-char passcode-char--empty";
      char.textContent = "*";
      field.valueEl.appendChild(char);
    }

    field.displayEl?.classList.toggle(
      "passcode-display--typing",
      field.digits.length > 0
    );
    field.displayEl?.classList.toggle(
      "passcode-display--active",
      isActive
    );
  }

  window.CoupleApp = window.CoupleApp || {};
  window.CoupleApp.passcodeNumpad = {
    PASSCODE_LENGTH,
    attachKeyboard,

    init({ fields, numpadEl }) {
      const fieldMap = new Map();
      const fieldKeys = fields.map((f) => f.key);
      let activeKey = fields[0]?.key || null;

      fields.forEach((f) => {
        fieldMap.set(f.key, { ...f, digits: [] });
        f.displayEl?.addEventListener("click", () => {
          activeKey = f.key;
          fieldMap.forEach((field, key) => renderField(field, key === activeKey));
        });
        renderField(fieldMap.get(f.key), f.key === activeKey);
      });

      function getActive() {
        return fieldMap.get(activeKey);
      }

      function advanceIfFull() {
        const field = getActive();
        if (!field || field.digits.length < PASSCODE_LENGTH) return;
        const idx = fieldKeys.indexOf(activeKey);
        if (idx >= 0 && idx < fieldKeys.length - 1) {
          activeKey = fieldKeys[idx + 1];
          fieldMap.forEach((f, k) => renderField(f, k === activeKey));
        }
      }

      function addDigit(d) {
        const field = getActive();
        if (!field || field.digits.length >= PASSCODE_LENGTH) return;
        field.digits.push(d);
        renderField(field, true);
        advanceIfFull();
      }

      function removeDigit() {
        const field = getActive();
        if (!field || field.digits.length === 0) return;
        field.digits.pop();
        renderField(field, true);
      }

      function clearActive() {
        const field = getActive();
        if (!field) return;
        field.digits = [];
        renderField(field, true);
      }

      function clearAll() {
        fieldMap.forEach((field, key) => {
          field.digits = [];
          renderField(field, key === activeKey);
        });
      }

      function getCode(key) {
        const field = fieldMap.get(key);
        if (!field || field.digits.length !== PASSCODE_LENGTH) return null;
        return field.digits.join("");
      }

      numpadEl?.addEventListener("click", (e) => {
        const key = e.target.closest(".numpad__key");
        if (!key) return;

        const digit = key.dataset.digit;
        const action = key.dataset.action;

        if (digit !== undefined) {
          addDigit(digit);
          return;
        }
        if (action === "back") removeDigit();
        if (action === "clear") clearActive();
      });

      let detachKeyboard = null;

      return {
        getCode,
        clearAll,
        setActive: (key) => {
          activeKey = key;
          fieldMap.forEach((field, k) => renderField(field, k === activeKey));
        },
        enableKeyboard: (isEnabled = () => true) => {
          detachKeyboard?.();
          detachKeyboard = attachKeyboard({
            isEnabled,
            onDigit: addDigit,
            onBackspace: removeDigit,
            onClear: clearActive,
          });
        },
        disableKeyboard: () => {
          detachKeyboard?.();
          detachKeyboard = null;
        },
      };
    },
  };
})();
