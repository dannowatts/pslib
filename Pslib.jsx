/*
	Pslib: Photoshop JSX Library of frequently-used functions


*/


// using and adding functions to Pslib object -- whether or not the library has been loaded
// this technique makes it easier to create and stabilize additional subfunctions separately before integrating them
try
{
	// this will throw an exception if Pslib cannot be found
	// a try/catch is necessary to achieve this, because a simple if(Pslib == undefined) will halt execution
	var attempt = Pslib != undefined;
}
catch(e)
{
	// if we have an error here, it's most likely because we didn't include the library in the preceding statements
	// the current script might be part of an include by a previously loaded 

	// $.level == 0 if the script is run by Photoshop, == 1 if run by ExtendScript ToolKit
	// if ESTK, then write to console for easier debugging
	if($.level) $.writeln("Pslib object not found. Creating placeholder.");

	// create Pslib as a persistent object 
	// it will remain accessible across most scopes, which is useful when working with panels & actions
	// 
	Pslib = function(){};
	
	// these functions are often required when working with code obtained through the ScriptingListener plugin
	cTID = function(s) {return app.charIDToTypeID(s);}
	sTID = function(s){return app.stringIDToTypeID(s);}
}

// #############  PER-LAYER METADATA FUNCTIONS


// load XMP
Pslib.loadXMPLibrary = function()
{
   if (!ExternalObject.AdobeXMPScript)
   {
      try
	{
         if($.level) $.writeln("Loading XMP Script Library");
         ExternalObject.AdobeXMPScript = new ExternalObject('lib:AdobeXMPScript');
      }
	catch (e)
	{
         if($.level) $.writeln("Error loading XMP Script Library\n" + e);
         return false;
      }
   }
   return true;
};

// unload XMP
Pslib.unloadXMPLibrary = function()
{
   if(ExternalObject.AdobeXMPScript) 
   {
      try
      {
	   if($.level) $.writeln("Unloading XMP Script Library");
         ExternalObject.AdobeXMPScript.unload();
         ExternalObject.AdobeXMPScript = undefined;
      }
      catch(e)
      {
         if($.level) $.writeln("Error unloading XMP Script Library\n" + e);
		return false;
      }
   }
	return true;
};

// get layer's existing XMP if present
Pslib.getXmp = function (layer, createNew)
{
	var layer = (layer == undefined ? app.activeDocument.activeLayer : layer);
	var createNew = (createNew == undefined ? false : createNew);
	var xmp;
	
	// if library loads without problem, proceed to get the layer's xmpMetadata
	if(loadXMPLibrary())
	{
		try
		{
			if($.level) $.writeln("Attempting to get metadata for layer \"" + layer.name + "\"");
			xmp = new XMPMeta( layer.xmpMetadata.rawData );
		}
		catch( e )
		{
			if($.level) $.writeln("Metadata could not be found for layer \"" + layer.name + "\"" + (createNew ? "\nCreating new XMP object." : "") );
			if(createNew) xmp = new XMPMeta();
		}
		return xmp;
	}
	else
	{
		return xmp;
	}
	
};

// set multiple properties
// expects a two-dimensional array
Pslib.setXmpProperties = function (layer, propertiesArray)
{
	// make sure XMP lib stuff is available
	if(loadXMPLibrary())
	{
		
		var layer = layer == undefined ? app.activeDocument.activeLayer : layer;
		var prop;
		var val;
		var xmp;
		
		// make sure we're not working with a background layer
		if(layer.isBackgroundLayer)
		{
			if($.level) $.writeln("Metadata cannot be placed on a background layer. Aborting.");
			return false;
		}
		
		// access metadata
		try{
		   xmp = new XMPMeta( layer.xmpMetadata.rawData );
		} catch( e ) {
			if($.level) $.writeln("XMP metadata could not be found for layer \"" + layer.name + "\". Creating new XMP object.");
		   xmp = new XMPMeta();
		}
	   
		// loop through array properties and assign them
		if($.level) $.writeln("\nLooping through properties...");
		for (var i = 0; i < propertiesArray.length; i++)
		{	
			prop = propertiesArray[i][0];
			val = propertiesArray[i][1];
			
			// modify metadata
			try
			{
				var propertyExists = xmp.doesPropertyExist(XMPConst.NS_EXIF, prop);
				
				// this decision statement is for debugging purposes
				
				// add new property if not found
				if(!propertyExists)
				{
					//xmpProperty = xmp.getProperty(XMPConst.NS_EXIF, property).toString();
					xmp.setProperty(XMPConst.NS_EXIF, prop, val);
					if($.level) $.writeln("\tadding [" + prop + ": " + val +"]  " + typeof val);
					
								/*
			// store type?
			  XMPConst.STRING
			   XMPConst.INTEGER
			   XMPConst.NUMBER
			   XMPConst.BOOLEAN
			   XMPConst.XMPDATE
   */
				}
				// if property found and value different, update
				else if(propertyExists && xmp.getProperty(XMPConst.NS_EXIF, prop).toString() != val.toString() )
				{
					xmp.setProperty(XMPConst.NS_EXIF, prop, val);
					if($.level) $.writeln("\tupdating [" + prop + ": " + val +"]  " + typeof val);
				}
				else
				{
					if($.level) $.writeln("\tno change to existing property [" + prop + ": " + val +"]  " + typeof val);
				}
				

			} 
			catch( e )
			{
				var msg = "Could not place metadata property on provided layer.\n[" + prop + ": " + val +  +"]  " + typeof val + "\n" + e;
			   if($.level) $.writeln( msg );
			   else alert(msg);
			   return false;
			}
		}

		// applly and serialize
		layer.xmpMetadata.rawData = xmp.serialize();
		if($.level) $.writeln("Provided properties were successfully added to object \"" + layer.name + "\"");
		
		// unload library
		unloadXMPLibrary();
		
		return true;
	}
	else
	{
		return false;
	}
};

// clear XMP : current workaround is to replace current data by empty data
// this is problematic if you actually want to strip the layer from its metadata object entirely 
Pslib.clearXmp = function (layer)
{
	if(loadXMPLibrary())
	{
		var layer = layer == undefined ? app.activeDocument.activeLayer : layer;
		//xmp = layerObject.xmpMetadata.rawData;
		var emptyXmp = new XMPMeta();
		
		layer.xmpMetadata.rawData = emptyXmp.serialize();
		
		/*
		// delete current XMP -- DOES NOT WORK
		try{
			var xmp = getXmp(layer);
			if(xmp) layer.xmpMetadata.rawData = undefined;
		   return true;
		} catch( e ) {
			if($.level) $.writeln("Metadata could not be found for layer \"" + layer.name + "\"");
			return false;
		}
		*/
		unloadXMPLibrary();
		return true;
	}
	else
	{
		return false;
	}
};

// save metadata to XML file
Pslib.exportLayerMetadata = function (layer, path)
{
	if(loadXMPLibrary())
	{
		var path = path == undefined ? File.saveDialog() : path;
		if(path != null)
		{
		   var file = new File(path);

		if(file.exists)
		{
			if($.level) $.writeln("\nFile already present. Prompting user for permission to replace.");
			// if file exists, present the user with the option to replace it
			if(confirm ("Do you wish to overwrite this file?\n\n" + file.fsName, true, "Replace file?"))
			{
				try
				{
					if($.level) $.writeln("Removing file:\n" + file.fsName );
					file.remove();	
				}
				catch(e)
				{
					if($.level) $.writeln("\nCould not remove file. Please verify that it is not open by a different process.");
					return false;
				}
			}
			else
			{
				if($.level) $.writeln("User opted not to replace the file.");
				return false;
			}
		}
		   
		   file.encoding = "UTF-8";
		   try
		   {
			file.open("w");
			file.write(layer.xmpMetadata.rawData.toString());
		   }
			catch(e)
			{
			   var msg = "";
			   if(e.message.match("\'value\' property is missing.") != null)
			   {	
				   msg += "There does not seem to be any metadata attached to layer \"" + layer.name + "\"";  
				}
				if($.level) $.writeln("Unable to write to file.\n" + e);
				return false;
			
		   }
		   file.close();
		}
		unloadXMPLibrary();
		return true;
	}
	else
	{
		return false;
	}
};

"Pslib successfully loaded";