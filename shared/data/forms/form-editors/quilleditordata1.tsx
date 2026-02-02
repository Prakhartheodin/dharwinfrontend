"use client"
import TiptapEditor from './tiptapeditor'

const defaultContent = `
  <h4><strong>Tiptap Editor</strong> is a free, open source rich text editor built for the modern web. With its modular architecture and expressive API, it is completely customizable to fit any need.</h4>
  <p><br/></p>
  <ol>
      <li>Write text select and edit with multiple options.</li>
      <li>This is Tiptap editor.</li>
      <li>Easy to customize and flexible.</li>
  </ol>
  <p><br/></p>
  <h4>Tiptap is a headless editor framework built on top of ProseMirror</h4>
`;

const Editor1: React.FC = () => {
  return (
    <TiptapEditor
      content={defaultContent}
      placeholder="Start typing..."
    />
  );
};

export default Editor1;
