const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createDomStub() {
  const listeners = {};
  const elements = new Map();

  function createElement(tagName) {
    const element = {
      tagName: tagName.toUpperCase(),
      children: [],
      attributes: {},
      dataset: {},
      className: '',
      innerHTML: '',
      textContent: '',
      value: '',
      classList: {
        add() {},
        remove() {},
        contains() { return false; },
      },
      appendChild(child) {
        this.children.push(child);
        return child;
      },
      addEventListener(event, handler) {
        if (!listeners[event]) {
          listeners[event] = [];
        }
        listeners[event].push(handler);
      },
      reset() {},
      closest() {
        return null;
      },
    };
    return element;
  }

  const document = {
    addEventListener(event, handler) {
      if (!listeners[event]) {
        listeners[event] = [];
      }
      listeners[event].push(handler);
    },
    dispatchEvent(event) {
      const handlers = listeners[event.type] || [];
      handlers.forEach((handler) => handler(event));
    },
    getElementById(id) {
      if (!elements.has(id)) {
        const element = createElement('div');
        elements.set(id, element);
      }
      return elements.get(id);
    },
    createElement(tagName) {
      return createElement(tagName);
    },
  };

  const formElement = document.getElementById('signup-form');
  formElement.addEventListener = function (event, handler) {
    if (!listeners[event]) {
      listeners[event] = [];
    }
    listeners[event].push(handler);
  };

  const emailInput = document.getElementById('email');
  emailInput.value = 'student@mergington.edu';

  const activitySelect = document.getElementById('activity');
  activitySelect.value = 'Chess Club';

  return { document, elements };
}

test('signup refreshes activity cards after a successful signup', async () => {
  const { document } = createDomStub();
  const fetchCalls = [];
  const activities = {
    'Chess Club': {
      description: 'Test activity',
      schedule: 'Today',
      max_participants: 10,
      participants: ['existing@mergington.edu'],
    },
  };

  const context = {
    document,
    console,
    fetch(url) {
      fetchCalls.push(url);
      if (url === '/activities') {
        return Promise.resolve({
          ok: true,
          json: async () => activities,
        });
      }
      if (url.startsWith('/activities/')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ message: 'Signed up' }),
        });
      }
      return Promise.reject(new Error('Unexpected fetch'));
    },
    setTimeout,
    clearTimeout,
  };

  const scriptPath = path.join(__dirname, '..', 'src', 'static', 'app.js');
  const script = fs.readFileSync(scriptPath, 'utf8');
  vm.createContext(context);
  vm.runInContext(script, context);

  document.dispatchEvent({ type: 'DOMContentLoaded' });
  await new Promise((resolve) => setTimeout(resolve, 0));

  const signupForm = document.getElementById('signup-form');
  const submitHandler = signupForm.listeners?.submit?.[0] || null;
  assert.ok(submitHandler, 'signup form should register a submit handler');

  await submitHandler({ preventDefault() {} });
  await new Promise((resolve) => setTimeout(resolve, 0));

  const activityFetches = fetchCalls.filter((url) => url === '/activities');
  assert.equal(activityFetches.length, 2, 'signup should refresh activities after success');
});
