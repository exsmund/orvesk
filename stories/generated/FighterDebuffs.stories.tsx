import type {Meta,StoryObj} from '@storybook/react-vite';
import {Example} from '../examples';
const meta={title:"Компоненты/Персонажи/FighterDebuffs",parameters:{componentName:"FighterDebuffs"}} satisfies Meta;
export default meta;
export const Preview:StoryObj<typeof meta>={name:'Пример',render:()=> <Example name="FighterDebuffs"/>};
