import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { message } from 'antd';
import './App.css';
import VanillaJSONEditor from './VanillaJSONEditor';
import { type Content } from 'vanilla-jsoneditor';

function App() {
  const [showEditor, ] = useState(true);
  const [readOnly] = useState(false);
  const [content, setContent] = useState<Content>({
    "text": ""
  });

  // const handleExportExcel = async () => {
  //   try {
  //     let jsonData;
  //     if ('text' in content) {
  //       try {
  //         jsonData = JSON.parse(content.text);
  //       } catch (e) {
  //         message.error('无效的JSON格式');
  //         return;
  //       }
  //     } else if ('json' in content) {
  //       jsonData = content.json;
  //     } else {
  //       message.error('请先输入JSON数据');
  //       return;
  //     }

  //     // 调用后端转换函数
  //     const excelBuffer = await invoke<number[]>("convert_json_to_excel", {
  //       jsonData: JSON.stringify(jsonData)
  //     });

  //     // 打开保存对话框
  //     const filePath = await save({
  //       filters: [{
  //         name: 'Excel',
  //         extensions: ['xlsx']
  //       }]
  //     });

  //     if (filePath) {
  //       // 保存文件
  //       await writeFile(filePath, new Uint8Array(excelBuffer));
  //       message.success('Excel文件导出成功！');
  //     }
  //   } catch (error) {
  //     message.error(`导出失败: ${error}`);
  //   }
  // };

  return (
    <div className="App">
      {showEditor && (
        <>
          {/* <div className="toolbar"> */}
            {/* <button onClick={handleExportExcel}>导出Excel</button> */}
          {/* </div> */}
          <div className="my-editor">
            <VanillaJSONEditor
              content={content}
              readOnly={readOnly}
              onChange={setContent}
            />
          </div>
        </>
      )}
    </div>
  );
}

export default App;

