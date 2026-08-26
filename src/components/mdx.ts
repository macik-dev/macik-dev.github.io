import Section from './Section.astro';
import Note from './Note.astro';
import Code from './Code.astro';
import Output from './Output.astro';
import Steps from './Steps.astro';
import Step from './Step.astro';
import VarFlow from './VarFlow.astro';
import VarBox from './VarBox.astro';
import Arrow from './Arrow.astro';
import Task from './Task.astro';
import TaskGroup from './TaskGroup.astro';
import Answer from './Answer.astro';
import Trainer from './Trainer.astro';

/**
 * Компоненты, которые доступны в любом .mdx без импортов.
 * Именно из-за этого списка урок пишется текстом, а не вёрсткой:
 * в файле урока сразу можно писать <Note>, <Task>, <Trainer>.
 */
export const mdxComponents = {
  Section,
  Note,
  Code,
  Output,
  Steps,
  Step,
  VarFlow,
  VarBox,
  Arrow,
  Task,
  TaskGroup,
  Answer,
  Trainer,
};
