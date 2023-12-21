import S from './styles.module.scss';
import { observable } from "mobx";
import React, { useState } from "react";
import {
  ILocalization,
  ILocalizer,
  ISectionPlugin,
  ISectionPluginData,
} from  "@origam/plugins";;
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
    var url = this.apiurl + "?refrowid=" + refRowId

    if (this.hasProperty(data, "EntityId"))
    {
      const EntityId = data.dataView.getCellValue(data.dataView.tableRows[0], "EntityId");
      url += "&entityid="+EntityId;
    }
    if (this.hasProperty(data, "Category"))
    {
      const Category = data.dataView.getCellValue(data.dataView.tableRows[0], "Category");
      url += "&category="+Category;
    }
     
    return (<FilePondComponent fileType={this.filterFileType} apiurl={url} invalidFileTypeMessage={this.invalidFileTypeMessage} 
    instantUpload={this.instantUpload} maxParallelUploads={this.maxParallelUploads} />    );
  }
  
  getProperty(data: ISectionPluginData, propertyId: string) {
    const property = data.dataView.properties.find(prop => prop.id === propertyId)
    if (!property) {
      throw new Error(`Property ${propertyId} was not found`)
    }
    return property;
  }

  hasProperty(data: ISectionPluginData, propertyId: string) {
    const property = data.dataView.properties.find(prop => prop.id === propertyId);
    if (property == undefined) {
      return false;
    }
    return true;
  }

  @observable
  getScreenParameters: (() => { [parameter: string]: string }) | undefined;

  generateData( data: ISectionPluginData, column: string) {
    return data.dataView.tableRows
       .map(row => 
             data.dataView.getCellValue(row, column)
         );
   }
}

export const FilePondComponent: React.FC<{
  fileType:string | undefined;
  apiurl:string;
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
  const [files] = useState([])
  const [setFiles]:any = useState([])
  function getAuthorization(): string | number | boolean {
    const token = sessionStorage.getItem('origamAuthToken');
    if(token != null)
    {
      return ` Bearer ${sessionStorage.getItem('origamAuthToken')}`;
    }
    return "";
  }

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
              onupdatefiles={setFiles}
              onerror={(error) => {if(error.code == 401) {alert("Please logout and login again.")} else {alert(error.body)}}}
              labelIdle='Drag & Drop your files or <span class="filepond--label-action">Browse</span>'
      />
      </div>
      </div>
      </div>
  )
}