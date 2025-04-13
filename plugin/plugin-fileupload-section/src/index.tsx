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

// Import the Image EXIF Orientation and Image Preview plugins
// Note: These need to be installed separately
import FilePondPluginImageExifOrientation from "filepond-plugin-image-exif-orientation";
import FilePondPluginImagePreview from "filepond-plugin-image-preview";
import "filepond-plugin-image-preview/dist/filepond-plugin-image-preview.css";

// Register the plugins
registerPlugin(FilePondPluginImageExifOrientation, FilePondPluginImagePreview);

// Register the plugin
registerPlugin(FilePondPluginFileValidateType);

const apiurl = "ApiUrl";
const apiloadurl = "ApiLoadUrl";
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
  apiloadurl: string = "" ;
  filterFileType: string | undefined;
  invalidFileTypeMessage: string | undefined;
  instantUpload:boolean | undefined;
  maxParallelUploads:number | undefined;
  labels: string[] = [];

  @observable
  initialized = false;

  initialize(xmlAttributes: { [key: string]: string }): void {
    this.apiurl = this.getXmlParameter(xmlAttributes, apiurl);
    this.apiloadurl = this.getXmlParameter(xmlAttributes, apiloadurl);
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
    
    var url = this.apiurl + urlparam
    var loadurl = this.apiloadurl + urlparam

    return (<FilePondComponent fileType={this.filterFileType} apiurl={url} loadurl={loadurl} invalidFileTypeMessage={this.invalidFileTypeMessage} 
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
  apiurl:string;
  loadurl:string;
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
  const [files, setFiles] = useState([]);
 
  
  function getAuthorization(): string {
    const token = sessionStorage.getItem('origamAuthToken');
    if (token != null) {
      return `Bearer ${token}`;
    }
    return "";
  }

  // Načtení souborů při inicializaci komponenty
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

        // Přístup k jednotlivým hodnotám
        const responseData = await response.json();
        const attachments = responseData.ROOT.Attachment;

       // Transformace příloh do formátu očekávaného FilePond
      const initialFiles = attachments.map((attachment: { Id: any; FileName: any; Data: any }) => ({
        source: attachment.Id, // Unikátní identifikátor souboru
        options: {
          type: "local",
          files: {
            name: attachment.FileName, // Název souboru
            size: 0, // Velikost souboru (pokud je dostupná)
            // Vložení dat souboru (pokud je dostupná)
            data: attachment.Data, // Data souboru (pokud je dostupná)
            type: "application/octet-stream", // Typ souboru (pokud je dostupný)
          },
        },
      }));

        setFiles(initialFiles);
      } catch (error) {
        console.error("Error fetching files:", error);
      }
    }

    fetchFiles();
  }, [props.loadurl]); // Spustí se pouze při změně `props.apiurl`


  return (
    <div className={S.mainContainer}>
      <div className={S.subContainer}>
      <div className="FilePondComponent" >
           <FilePond
              server={
                {
                   process: {
                       url: props.apiurl,
                       headers: ({
                         Authorization: getAuthorization()
                       })
                   }
               }
               }
              allowFileTypeValidation={allowFileTypeValidation}
              acceptedFileTypes={[ftype]}
              labelFileTypeNotAllowed={props.invalidFileTypeMessage}
              instantUpload={props.instantUpload??false}
              maxParallelUploads={props.maxParallelUploads??1}
              files={files}
              allowReorder={true}
              allowMultiple={true}
              onupdatefiles={(fileItems) => {
                // Set current file objects to this.state
                useState({
                    files: fileItems.map((fileItem) => fileItem.file),
                });
            }}
              onerror={(error: any) => {if(error.code == 401) {alert("Please logout and login again.")} else {alert(error.body)}}}
              labelIdle='Drag & Drop your files or <span class="filepond--label-action">Browse</span>'
      />
      </div>
      </div>
      </div>
  )
}