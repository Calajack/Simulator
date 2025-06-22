/*
 *   Copyright 
 *               	neaPay.com
 * 		                                contact@neapay.com
 * Registration: neaSoft NL
 * KvK 72447931 Vestigingsnr. 000040557146
 * All rights reserved, all third party software mentioned
 * 
 */
/*
 *                          FREE version
 * The purpose of this version is for learning, peparation, POC, Business Assessment
 * This cannot be used for anything commercial or with financial or business impact.
 * 
 * Free versions are usually BETA tests and have absolutely NO GUARANTEE.
 * 
 * Free versions are NOT tested enough to be used in a production or business-impacting environment.
 * 
 *        Thank you!
 *
 */
 
 
 /*
 * Script variable.
 * Enable or disable the display of messages in console. 
 * Disabling messages in console decreases memory usage and increases speed
 */
var displayInfo = true;

/*
 * Script variable. enable logging when assigning a value to a field. 
 * Generates a lot of logs!
 * Should be used when debugging fileds population with values
 * Values are true or false
 */
var displaySetValue = false;

/*
 * CORE variable! Enable automatic generation of Output logs to folder: logs
 * Values are true or false
 */
setFileLogging(true);

/*
 * CORE variable! Enable automatic generation of Exception logs to folder: logs
 * Values are true or false
 */
setFileExceptionLogging(true);


/*
 * CORE variable! Enable tracing at TCP level through the system.
 * Generates a lot of logs!
 * Should be used when debugging TCP traffic and message parsing
 * Values are true or false
 */
setTraceTransmission(false);


/*
 * CORE variable Enable tracing on CSV data files and other configuration. 
 * Generates huge logs!
 * Values are true or false
 */
setTraceConfiguration(false);