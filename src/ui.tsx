/** @jsx h */
import { h } from 'preact';
import { render } from '@create-figma-plugin/ui';
import { App } from './components/App';

function UI() {
  return <App />;
}

export default render(UI); 