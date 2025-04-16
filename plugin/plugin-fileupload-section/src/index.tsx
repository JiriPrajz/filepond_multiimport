import S from './styles.module.scss';
import { observable } from "mobx";
import React, { useState, useEffect } from "react";
import { ISectionPlugin } from "plugins/interfaces/ISectionPlugin";
import { ISectionPluginData } from "plugins/interfaces/ISectionPluginData";
import { ILocalization } from "plugins/interfaces/ILocalization";
import { ILocalizer } from "plugins/interfaces/ILocalizer";
import { FilePond,registerPlugin } from 'react-filepond';
import FilePondPluginFileValidateType from 'filepond-plugin-file-validate-type';
import 'filepond/dist/filepond.min.css'
import FilePondPluginImageExifOrientation from "filepond-plugin-image-exif-orientation";
import FilePondPluginImagePreview from "filepond-plugin-image-preview";
import "filepond-plugin-image-preview/dist/filepond-plugin-image-preview.css";
import FilePondPluginFilePoster from "filepond-plugin-file-poster";
import FilePondPluginFileEncode from 'filepond-plugin-file-encode';
import 'filepond-plugin-file-poster/dist/filepond-plugin-file-poster.css';
import { FilePondErrorDescription, FilePondFile } from 'filepond';
//import FilePondPluginImageResize from 'filepond-plugin-image-resize';

// Register the plugin
registerPlugin(FilePondPluginFileEncode);
registerPlugin(FilePondPluginImageExifOrientation, FilePondPluginImagePreview);
registerPlugin(FilePondPluginFileValidateType);
registerPlugin(FilePondPluginFilePoster);
//registerPlugin(FilePondPluginImageResize);

const apiurl = "ApiUrl";
const filterFileType = "FilterFileType";
const invalidFileTypeMessage = "InvalidFileTypeMessage"
const maxParallelUploads = "MaxParallelUploads"
const instantUpload = "InstantUpload"

export class FileUploadSectionPlugin implements ISectionPlugin {
  createLocalizer: ((localizations: ILocalization[]) => ILocalizer) | undefined;
  onSessionRefreshed(): void {
    
  }
  requestSessionRefresh: (() => Promise<any>) | undefined;
  setScreenParameters: ((parameters: { [key: string]: string; }) => void) | undefined;
  $type_ISectionPlugin: 1 = 1;
  id: string = ""
  apiurl: string = "" ;
  filterFileType: string | undefined;
  invalidFileTypeMessage: string | undefined;
  instantUpload:boolean | undefined;
  maxParallelUploads:number | undefined;
  labels: string[] = [];

  @observable
  initialized = false;

  initialize(xmlAttributes: { [key: string]: string }): void {
    this.apiurl = this.getXmlParameter(xmlAttributes, apiurl);
    this.filterFileType = this.getXmlParameter(xmlAttributes, filterFileType);
    this.invalidFileTypeMessage = this.getXmlParameter(xmlAttributes, invalidFileTypeMessage);
    this.instantUpload = (this.getXmlParameter(xmlAttributes, instantUpload) =="true");
    this.maxParallelUploads = Number.parseInt(this.getXmlParameter(xmlAttributes, maxParallelUploads));
    this.initialized = true;
  }
  getXmlParameter(xmlAttributes: { [key: string]: string }, parameterName: string) {
    if (!xmlAttributes[parameterName]) {
      throw new Error(`Parameter ${parameterName} was not found.`)
    }
    return xmlAttributes[parameterName];
  }

  getComponent(data: ISectionPluginData, createLocalizer: (localizations: ILocalization[]) => ILocalizer): JSX.Element {
    this.createLocalizer = createLocalizer;
        if (!this.initialized) {
      return <></>;
    }

    if(!this.hasProperty(data, "RowId"))
    {
      return <></>;
    }

    const refRowId = data.dataView.getCellValue(data.dataView.tableRows[0], "RowId");
    var urlparam = "?refrowid=" + refRowId
    
    if (this.hasProperty(data, "EntityId"))
    {
      const EntityId = data.dataView.getCellValue(data.dataView.tableRows[0], "EntityId");
      urlparam += "&entityid="+EntityId;
    }
    if (this.hasProperty(data, "Category"))
    {
      const Category = data.dataView.getCellValue(data.dataView.tableRows[0], "Category");
      urlparam += "&category="+Category;
    }
    
    const importurl = this.apiurl + "/import" + urlparam
    var loadurl = this.apiurl + "/load" + urlparam
    var reverturl = this.apiurl + "/remove" 

    return (<FilePondComponent fileType={this.filterFileType} importurl={importurl} loadurl={loadurl} reverturl={reverturl} invalidFileTypeMessage={this.invalidFileTypeMessage} 
    instantUpload={this.instantUpload} maxParallelUploads={this.maxParallelUploads} />    );
  }
  
  getProperty(data: ISectionPluginData, propertyId: string) {
    const property = data.dataView.properties.find((prop: { id: string; }) => prop.id === propertyId)
    if (!property) {
      throw new Error(`Property ${propertyId} was not found`)
    }
    return property;
  }

  hasProperty(data: ISectionPluginData, propertyId: string) {
    const property = data.dataView.properties.find((prop: { id: string; }) => prop.id === propertyId);
    if (property == undefined) {
      return false;
    }
    return true;
  }

  @observable
  getScreenParameters: (() => { [parameter: string]: string }) | undefined;

  generateData( data: ISectionPluginData, column: string) {
    return data.dataView.tableRows
       .map((row: any) => 
             data.dataView.getCellValue(row, column)
         );
   }
}

export const FilePondComponent: React.FC<{
  fileType:string | undefined;
  importurl:string;
  loadurl:string;
  reverturl:string;
  invalidFileTypeMessage:string | undefined
  instantUpload:boolean | undefined
  maxParallelUploads:number | undefined

}> = (props) => {
  var ftype: string = props.fileType ?? "";
  var allowFileTypeValidation : boolean = true;
  if (ftype == "*")
  {
      allowFileTypeValidation = false;
      ftype = "";
  }
  const [files, setFiles] = useState<File[]>([]);
  
  function getAuthorization(): string {
    const token = sessionStorage.getItem('origamAuthToken');
    if (token != null) {
      return `Bearer ${token}`;
    }
    return "";
  }

  function base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
  
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
  
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }

  useEffect(() => {
    async function fetchFiles() {
      try {
        const response = await fetch(`${props.loadurl}`, {
          headers: {
            Authorization: getAuthorization(),
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch files: ${response.statusText}`);
        }

        const responseData = await response.json();
        const attachments = responseData.ROOT.Attachment;

        const initialFiles = attachments.map((attachment: { Id: any; FileName: any; Data: any }) => {
        const mimeType = 'image/' + attachment.FileName.split('.').pop();
        const blob = base64ToBlob(attachment.Data, mimeType);
        const file = new File([blob], attachment.FileName, { type: mimeType });
        const posterDataURL = "data:image/jpeg;base64," + attachment.Data;
        return {
          source: file,
          options: {
            type: "local",
            load: true,
            metadata: {
              poster: posterDataURL,
              id: attachment.Id
            },
            file: {
              id: attachment.Id,
              name: attachment.FileName,
              type: mimeType,
              size: file.size,
              data: attachment.Data
            }
          },
        };
      });
      
        setFiles(initialFiles);
      } catch (error) {
        console.error("Error fetching files:", error);
      }
    }

    fetchFiles();
  }, [props.loadurl]);

  function handleRemove(errRes: FilePondErrorDescription | null, file: FilePondFile): void {
    if (errRes) {
      console.error("Error removing file:", errRes);
      return;
    }

    const formData = new FormData();
    formData.append("fileId", file.getMetadata('id') as string);

    fetch(props.reverturl, {
      method: "POST",
      body: formData,
      headers: {
        Authorization: getAuthorization(),
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to remove file: ${response.statusText}`);
        }
        console.log("File removed successfully");
      })
      .catch((error) => {
        console.error("Error removing file:", error);
      });
  }

  function beforeRemove(item: FilePondFile): boolean | Promise<boolean> {
      return confirm("Are you sure you want to remove this file?");
  }

  function handleClick(file: FilePondFile): void {
    console.log("File clicked:", file.filename);
  }

  return (
    <div className={S.mainContainer}>
      <div className={S.subContainer}>
      <div className="FilePondComponent" >
           <FilePond beforeRemoveFile={beforeRemove}
              server={
                {
                   process: {
                       url: props.importurl,
                       headers: ({
                         Authorization: getAuthorization()
                       })
                   }
               }
               }
              allowFilePoster={true}
              allowFileTypeValidation={allowFileTypeValidation}
              acceptedFileTypes={[ftype]}
              labelFileTypeNotAllowed={props.invalidFileTypeMessage}
              instantUpload={props.instantUpload??false}
              maxParallelUploads={props.maxParallelUploads??1}
              allowImagePreview={true}
              files={files}
              onupdatefiles={(fileItems: FilePondFile[]) => {
                setFiles(fileItems.map((f: FilePondFile) => f.file as File));
              }}
              onremovefile={(errRes, file) => handleRemove(errRes, file)}
              onactivatefile={(file) => handleClick(file)}
              allowRevert={true}
              allowDrop={true}
              allowReorder={true}
              allowMultiple={true}
              onerror={(error: any) => {if(error.code == 401) {alert("Please logout and login again.")} else {alert(error.body)}}}
              labelIdle='Drag & Drop your files or <span class="filepond--label-action">Browse</span>'
      />
      </div>
      </div>
      </div>
  )
}