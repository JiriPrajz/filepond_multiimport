Contains file upload plugin for Origam based on the filepond.js library.

## File Upload Plugin

Properties that can be read from the model (defined in a widget):

- `ApiUrl` name of a string field which will be used to set endpoint
- `FilterFileType` name of a string field which will allow file type for upload.
- `InvalidFileTypeMessage` name of a string field which will show text when file type is wrong.
- `MaxParallelUploads` name of a number field which will set max paraell files to upload in a time.
- `InstantUpload` name of a boolean field which will allow automatic upload (true) or manualy (false) upload files to the ApiUrl.