import { Observable } from 'rxjs/Rx'

import Fetch from './workflow/fetch'
import Render from './workflow/render'
import Clip from './workflow/clip'
import Adjust from './workflow/adjust'

import Elements from './elements'
import Direction from './direction'
import Data from './data'

const Workflow = {

  cycle: (direction) =>
    Observable.create(observer => {
      Fetch.run(direction)
      .then(items => Render.run(items, direction))
      .then(items => {
        Adjust.run(direction, items);
        Data.position = Elements.viewport.scrollTop;
        Clip.run(Direction.opposite(direction));
        console.log(direction + ' cycle is done');
        observer.next(direction);
        observer.complete();
      })
      .catch(error => {
         error && console.error(error);
         observer.complete();
       });
    }),

  run: (param) => {
    let direction;
    if(typeof param === 'string') {
      direction = param;
    }
    else {
      // scroll event
      console.log('FIRE!')
      direction = Direction.byScrollTop();
    }
    if(!Direction.isValid(direction)) {
      return;
    }

    const run = () =>
      Workflow.cycle(direction).subscribe(run);

    run();
  }
}

export default Workflow

// fetch -> render -> adjust + clip + fetch