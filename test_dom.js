const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
const document = dom.window.document;
// mock 
const opts = { label: 'Save', onSubmit: () => {} };
const ICONS = { bookmark: 'B', arrow: 'A' };
const btn = document.createElement("form");
btn.className = "pill floating";
const renderIdle = () => {
  btn.innerHTML = <button type="button" class="prompt-form" style="background:transparent;border:none;color:inherit;font:inherit;cursor:pointer;padding:0;outline:none;"><span class="icon"> + ICONS.bookmark + </span><span class="label" data-testid="forgot-ai-pill-status"> + (opts.label || "Save to Forgot AI") + </span></button>;
};
renderIdle();
console.log('IDLE STATE:', btn.innerHTML);

const setState = (state) => {
    btn.className = "pill floating";
    if (state === "prompting") {
      btn.classList.add("prompting");
      btn.innerHTML = 
        <div class="prompt-form">
          <input type="text" class="prompt-input" placeholder="Why are you saving this?" autofocus />
          <button type="submit" class="prompt-submit"> + ICONS.arrow + </button>
        </div>
      ;
      return;
    }
}
setState('prompting');
console.log('PROMPTING STATE:', btn.innerHTML);

