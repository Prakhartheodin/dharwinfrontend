"use client"
import TiptapEditor from '@/shared/data/forms/form-editors/tiptapeditor'

interface data1 {
  value:number;
  label:string;
}
export const Data:data1[] = [
    { value: 1, label: 'High' },
    { value: 2, label: 'Low' },
    { value: 3, label: 'Medium' },
];

interface data {
  value:number;
  label:string;
}
export const Data1:data[] = [
    { value: 1, label: 'Inprogress' },
    { value: 2, label: 'On hold' },
    { value: 3, label: 'completed' },
];

interface multiselectdata1 {
  value:string;
  label:string;
}

export const multiselectdata:multiselectdata1[] = [
    { value: 'Angelina May', label: 'Angelina May' },
    { value: 'Kiara advain', label: 'Kiara advain' },
    { value: 'Hercules Jhon', label: 'Hercules Jhon' },
    { value: 'Mayor Kim', label: 'Mayor Kim' },
    { value: 'Alexa Biss', label: 'Alexa Biss' },
    { value: 'Karley Dia', label: 'Karley Dia' },
    { value: 'Darren Sami', label: 'Darren Sami' },
    { value: 'Elizabeth', label: 'Elizabeth' },
    { value: 'Bear Gills', label: 'Bear Gills' },
    { value: 'Alex Carey', label: 'Alex Carey' }
];


const defaultContent = `
<p>lorem Contrary to popular belief, Lorem Ipsum is not simply random text. It has roots in a piece of classical Latin literature from 45 BC, making it over 2000 years old. Richard McClintock, a Latin professor at Hampden-Sydney College in Virginia, looked up one of the more obscure Latin words, consectetur, from a Lorem Ipsum passage, and going through the cites of the word in classical literature, discovered the undoubtable source. Lorem Ipsum comes from sections 1.10.32 and 1.10.33.</p>
<p><br></p>
<ol>
    <li>Conducting a comprehensive analysis of the existing website design.</li>
    <li>Collaborating with the UI/UX team to develop wireframes and mockups.</li>
    <li>Iteratively refining the design based on feedback.</li>
    <li>Implementing the finalized design changes using HTML, CSS, and JavaScript.</li>
    <li>Testing the website across different devices and browsers.</li>
</ol>
`;

const Editordata: React.FC = () => {
  return (
    <div>
      <TiptapEditor
        content={defaultContent}
        placeholder="Enter project description..."
      />
    </div>
  );
}

export default Editordata;