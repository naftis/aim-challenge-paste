import React, { useState } from 'react';
import './App.css';
import Modal from 'react-modal';
import { useLocalStorage } from '@rehooks/local-storage';

Modal.setAppElement('#root');

interface RawRun {
  createdOn: number;
  rows: string[];
}

interface Tick {
  readableTime: string;
  time: number;
  text: string;
}

interface Run extends RawRun {
  finishTime: number;
  readableFinishTime: string;
  createdOn: number;
  ticks: Tick[];
}

const timeToMilliseconds = (time: string) => {
  let [minutes, seconds, milliseconds] = time.split(/[:.]/).map(Number);
  minutes *= 1000 * 60;
  seconds *= 1000;

  return minutes + seconds + milliseconds;
};

const parseText = (text: string) => {
  const lines = text.split('\n');
  const firstLine = lines.findIndex(line => line.includes('started'));
  const lastLine = lines.findIndex(line => line.includes('finished'));
  const trueLines = lines.slice(firstLine, lastLine + 1);

  return {
    createdOn: Date.now(),
    rows: trueLines
  };
};

const parseInfo = (run: RawRun): Run => {
  const ticks = run.rows.map(tick => {
    const [time, , text] = tick.split(' | ');
    return {
      readableTime: time,
      time: timeToMilliseconds(time),
      text
    };
  });

  const [lastLine] = run.rows.slice(-1);
  const readableFinishTime = (
    /\d\d:\d\d.\d\d\d/.exec(lastLine) || ''
  ).toString();
  const finishTime = timeToMilliseconds(readableFinishTime);

  return {
    rows: run.rows,
    readableFinishTime,
    finishTime,
    createdOn: run.createdOn,
    ticks
  };
};

const parseRuns = (runs: RawRun[]) => {
  const parsedRuns = runs.map(parseInfo);
  parsedRuns.sort((a, b) => {
    if (a.finishTime < b.finishTime) {
      return -1;
    }
    if (a.finishTime > b.finishTime) {
      return 1;
    }
    return 0;
  });
  return parsedRuns;
};

const App: React.FC = () => {
  const [text, setText] = useState('');
  const [nullableRuns, setRuns] = useLocalStorage<RawRun[]>('runs');
  const runs = nullableRuns ? parseRuns(nullableRuns) : [];
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRun, setSelectedRun] = useState<Run>();
  const [isKillsToggled, setIsKillsToggled] = useState(false);

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { value } = event.target;
    setText(value);

    if (value.includes('started') && value.includes('finished')) {
      setRuns([...runs, parseText(value)]);
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
    setRuns(runs.filter(run => run.createdOn !== toBeRemovedRun.createdOn));
  };

  const renderTicks = (ticks: Tick[]) =>
    ticks
      .filter(tick => !isKillsToggled || !tick.text.includes('kill'))
      .map(tick => (
        <tr>
          <td className="number">
            {/(course|zone)/i.exec(tick.text) ? (
              <b>{tick.readableTime}</b>
            ) : (
              tick.readableTime
            )}
          </td>
          <td>{tick.text}</td>
        </tr>
      ));

  const renderRun = (run: Run) => (
    <>
      <h2>{run.finishTime}</h2>
      <i>{new Date(run.createdOn).toLocaleString()}</i>
      <br />
      <button onClick={() => setIsKillsToggled(!isKillsToggled)}>
        {isKillsToggled ? 'Show kills' : 'Hide kills'}
      </button>
      <table>{renderTicks(run.ticks)}</table>
      <button className="remove" onClick={removeRun(run)}>
        <span role="img" aria-label="remove">
          🗑️
        </span>{' '}
        Remove
      </button>
    </>
  );

  const fillerBoxes = Array.from({ length: 3 - (runs.length % 3) });

  return (
    <main>
      <textarea
        value={text}
        placeholder="Paste !l -command output here"
        onChange={handleChange}
      />

      <section className="runs">
        {runs.map((run, i) => (
          <button
            key={Number(run.createdOn)}
            className="run"
            onClick={openModal(run)}
          >
            {run.readableFinishTime}{' '}
            {i > 0 && <sup>+{run.finishTime - runs[0].finishTime}</sup>}
          </button>
        ))}
        {fillerBoxes.map((_, index) => (
          <div key={`empty${index}`} className="empty" />
        ))}
      </section>

      <Modal isOpen={isModalOpen} onRequestClose={() => setIsModalOpen(false)}>
        <aside>
          <button className="close" onClick={() => setIsModalOpen(false)}>
            <span role="img" aria-label="close">
              ❌
            </span>
          </button>
        </aside>
        <section className="modal">
          {selectedRun && renderRun(selectedRun)}
        </section>
      </Modal>
    </main>
  );
};

export default App;
