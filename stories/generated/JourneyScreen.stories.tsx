import type {Meta,StoryObj} from '@storybook/react-vite';
import {Example} from '../examples';
const meta={title:"Компоненты/Путешествие/JourneyScreen",parameters:{componentName:"JourneyScreen"}} satisfies Meta;
export default meta;
export const Preview:StoryObj<typeof meta>={name:'Пример',render:()=> <Example name="JourneyScreen"/>};
