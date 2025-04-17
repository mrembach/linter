import { BuildOptions } from '@create-figma-plugin/build';

const options: BuildOptions = {
  main: {
    src: 'src/main.ts',
    handler: 'default'
  },
  ui: {
    src: 'src/ui.tsx'
  },
  name: '',
  permissions: ['teamlibrary']
};

export default options; 