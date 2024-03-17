import { Workflow, IDatasourceConstructed } from '../../../src/index';

interface Scroller {
  workflow: InstanceType<typeof Workflow>;
  datasource: IDatasourceConstructed;
}
interface ScrollerClass {
  new(datasource: IDatasourceConstructed): Scroller;
}

export type VSCROLL = {
  workflow: Scroller['workflow'];
  datasource: Scroller['datasource'];
  Scroller: ScrollerClass;
  scroller: Scroller;
  scroller1: Scroller;
  scroller2: Scroller;
};
