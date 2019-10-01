import React, { useState, useEffect } from 'react';
import './App.css';
import Modal from 'react-modal';
import { useLocalStorage } from '@rehooks/local-storage';

Modal.setAppElement('#root');

interface Run {
  createdOn: number;
  ticks: string[];
}

const parseText = (text: string) => {
  const lines = text.split('\n');
  const firstLine = lines.findIndex(line => line.includes('started'));
  const lastLine = lines.findIndex(line => line.includes('finished'));
  const trueLines = lines.slice(firstLine, lastLine + 1);

  return {
    createdOn: Date.now(),
    ticks: trueLines
  };
};

const getTime = (tick: string) =>
  (/\d\d:\d\d.\d\d\d/.exec(tick) || '').toString();

const parseInfo = (ticks: string[]) => {
  const [lastLine] = ticks.slice(-1);
  const finishTime = getTime(lastLine);

  return {
    finishTime
  };
};

const App: React.FC = () => {
  const [text, setText] = useState('');
  const [runs, setRuns] = useLocalStorage<Run[]>('runs');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRun, setSelectedRun] = useState<Run>();
  const [isKillsToggled, setIsKillsToggled] = useState(false);

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { value } = event.target;

    setText(value);

    if (value.includes('started') && value.includes('finished')) {
      setRuns([...(runs || []), parseText(value)]);
      setText('');
    }
  };

  const openModal = (run: Run) => () => {
    setSelectedRun(run);
    setIsModalOpen(true);
  };

  const removeRun = (toBeRemovedRun: Run) => () => {
    setSelectedRun(undefined);
    setIsModalOpen(false);
    setRuns(
      (runs || []).filter(run => run.createdOn !== toBeRemovedRun.createdOn)
    );
  };

  const renderSelectedRun = () => {
    if (!selectedRun) {
      return;
    }

    const info = parseInfo(selectedRun.ticks);

    return (
      <>
        <h2>{info.finishTime}</h2>
        <i>{new Date(selectedRun.createdOn).toLocaleString()}</i><br />
        <button onClick={() => setIsKillsToggled(!isKillsToggled)}>
          {isKillsToggled ? 'Show kills' : 'Hide kills'}
        </button>
        <pre>
          {selectedRun.ticks
          .filter(tick => !isKillsToggled || !tick.includes('kill'))
          .map(tick => (
            <>
              {/(course|zone)/i.exec(tick) ? <b>{tick}</b> : tick}
              <br />
            </>
          ))}
        </pre>
        <button onClick={removeRun(selectedRun)}>Remove</button>
      </>
    );
  };

  return (
    <main>
      <textarea
        value={text}
        placeholder="Paste !l -command output here"
        onChange={handleChange}
      />

      <section>
        {(runs || []).map(run => {
          const info = parseInfo(run.ticks);

          return (
            <button key={Number(run.createdOn)} onClick={openModal(run)}>
              {info.finishTime}
            </button>
          );
        })}
        {Array.from({ length: 3 - ((runs || []).length % 3) }).map(
          (_, index) => (
            <div key={`empty${index}`} className="empty" />
          )
        )}
      </section>

      <Modal isOpen={isModalOpen} onRequestClose={() => setIsModalOpen(false)}>
        {renderSelectedRun()}
      </Modal>
    </main>
  );
};

export default App;
