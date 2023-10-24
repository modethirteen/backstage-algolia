import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';

window.scroll = jest.fn();
Element.prototype.scrollIntoView = jest.fn();

afterEach(() => {
  cleanup();
});
