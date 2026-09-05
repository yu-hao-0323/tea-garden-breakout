import {body,errorResponse,gameState,json,requireOrigin,requireSession} from '../../../lib/server';
export async function GET(request:Request){try{const user=await requireSession(request);return json({user,...await gameState(user.id)});}catch(error){return errorResponse(error);}}
export async function POST(request:Request){try{requireOrigin(request);const user=await requireSession(request);return json({user,...await gameState(user.id,await body(request))});}catch(error){return errorResponse(error);}}
