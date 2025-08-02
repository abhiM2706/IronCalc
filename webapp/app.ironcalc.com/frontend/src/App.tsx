import "./App.css";
import styled from "@emotion/styled";
import { useEffect, useState } from "react";
import { FileBar } from "./components/FileBar";
import {
  get_documentation_model,
  get_model,
  uploadFile,
} from "./components/rpc";
import {
  createNewModel,
  deleteSelectedModel,
  loadModelFromStorageOrCreate,
  saveModelToStorage,
  saveSelectedModelInStorage,
  selectModelFromStorage,
} from "./components/storage";

// From IronCalc
import { IronCalc, IronCalcIcon, Model, init } from "@ironcalc/workbook";

function App() {
  const [model, setModel] = useState<Model | null>(null);

  useEffect(() => {
    async function start() {
      try {
        console.log('Starting IronCalc initialization...');
        await init();
        console.log('IronCalc initialization completed');
        
        const queryString = window.location.search;
        const urlParams = new URLSearchParams(queryString);
        const modelHash = urlParams.get("model");
        const exampleFilename = urlParams.get("example");
        
        console.log('URL params:', { modelHash, exampleFilename });
        
        // If there is a model name ?model=modelHash we try to load it
        // if there is not, or the loading failed we load an empty model
        if (modelHash) {
          // Get a remote model
          try {
            console.log('Loading remote model:', modelHash);
            const model_bytes = await get_model(modelHash);
            const importedModel = Model.from_bytes(model_bytes);
            localStorage.removeItem("selected");
            setModel(importedModel);
            console.log('Remote model loaded successfully');
          } catch (e) {
            console.error('Failed to load remote model:', e);
            alert("Model not found, or failed to load");
          }
        } else if (exampleFilename) {
          try {
            console.log('Loading example file:', exampleFilename);
            const model_bytes = await get_documentation_model(exampleFilename);
            const importedModel = Model.from_bytes(model_bytes);
            localStorage.removeItem("selected");
            setModel(importedModel);
            console.log('Example file loaded successfully');
          } catch (e) {
            console.error('Failed to load example file:', e);
            alert("Example file not found, or failed to load");
          }
        } else {
          // try to load from local storage
          console.log('Loading from local storage or creating new model');
          const newModel = loadModelFromStorageOrCreate();
          setModel(newModel);
          console.log('Model loaded/created successfully');
        }
      } catch (error) {
        console.error('Error during startup:', error);
        alert('Failed to initialize IronCalc: ' + error);
      }
    }
    start();
  }, []);

  if (!model) {
    return (
      <Loading>
        <IronCalcIcon style={{ width: 24, height: 24, marginBottom: 16 }} />
        <div>Loading IronCalc</div>
      </Loading>
    );
  }

  // We try to save the model every second
  setInterval(() => {
    const queue = model.flushSendQueue();
    if (queue.length !== 1) {
      saveSelectedModelInStorage(model);
    }
  }, 1000);

  // We could use context for model, but the problem is that it should initialized to null.
  // Passing the property down makes sure it is always defined.

  return (
    <Wrapper>
      <FileBar
        model={model}
        onModelUpload={async (arrayBuffer: ArrayBuffer, fileName: string) => {
          const blob = await uploadFile(arrayBuffer, fileName);

          const bytes = new Uint8Array(await blob.arrayBuffer());
          const newModel = Model.from_bytes(bytes);
          saveModelToStorage(newModel);

          setModel(newModel);
        }}
        newModel={() => {
          setModel(createNewModel());
        }}
        setModel={(uuid: string) => {
          const newModel = selectModelFromStorage(uuid);
          if (newModel) {
            setModel(newModel);
          }
        }}
        onDelete={() => {
          const newModel = deleteSelectedModel();
          if (newModel) {
            setModel(newModel);
          }
        }}
      />
      <IronCalc model={model} />
    </Wrapper>
  );
}

const Wrapper = styled("div")`
  margin: 0px;
  padding: 0px;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  position: absolute;
`;

const Loading = styled("div")`
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-family: "Inter";
  font-size: 14px;
`;

export default App;
